import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { deactivatePreviousDeployments } from '../../actions/deactivate-previous-deployments/deactivate.mjs'

const options = {
  currentDeploymentId: '200',
  token: 'test-token',
  repository: 'owner/repo',
}
const deployment = (id: number, state: string | null = 'SUCCESS') => ({
  databaseId: id,
  latestStatus: state ? { state } : null,
})
const page = (nodes: ReturnType<typeof deployment>[], cursor: string | null = null) => ({
  data: {
    repository: {
      deployments: {
        nodes,
        pageInfo: { hasNextPage: cursor !== null, endCursor: cursor },
      },
    },
  },
})

function mockApi(...responses: unknown[]) {
  const calls: { url: string; body: any }[] = []
  spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null })
    if (!responses.length) throw new Error('Unexpected API request')
    const response = responses.shift()
    return response instanceof Response ? response : Response.json(response)
  })
  return calls
}

afterEach(() => mock.restore())

test('only deactivates older successful deployments in the current environment', async () => {
  const calls = mockApi(
    { environment: 'prod' },
    page([
      deployment(201), deployment(200), deployment(199),
      deployment(198, 'FAILURE'), deployment(197, 'INACTIVE'),
      deployment(196, 'IN_PROGRESS'), deployment(195, null), deployment(194, 'PENDING'),
    ]),
    {},
  )

  expect(await deactivatePreviousDeployments(options)).toBe(1)
  expect(calls[1].body.variables).toEqual({ owner: 'owner', name: 'repo', environment: 'prod', cursor: null })
  expect(calls[2]).toEqual({
    url: 'https://api.github.com/repos/owner/repo/deployments/199/statuses',
    body: { state: 'inactive', description: 'Superseded by deployment 200', auto_inactive: false },
  })
  expect(calls).toHaveLength(3)
})

test('paginates beyond 100 deployments before changing statuses', async () => {
  const calls = mockApi(
    { environment: 'dev' },
    page(Array.from({ length: 100 }, (_, i) => deployment(300 - i)), 'next-page'),
    page([deployment(200), deployment(199)], 'last-page'),
    page([deployment(198)]),
    {}, {},
  )

  expect(await deactivatePreviousDeployments(options)).toBe(2)
  expect(calls[2].body.variables.cursor).toBe('next-page')
  expect(calls[3].body.variables.cursor).toBe('last-page')
  expect(calls.slice(4).map(call => call.url)).toEqual([
    'https://api.github.com/repos/owner/repo/deployments/199/statuses',
    'https://api.github.com/repos/owner/repo/deployments/198/statuses',
  ])
})

test.each(['FAILURE', 'INACTIVE', 'PENDING', null])('rejects a current deployment with status %s without writes', async state => {
  const calls = mockApi({ environment: 'dev' }, page([deployment(200, state), deployment(199)]))
  await expect(deactivatePreviousDeployments(options)).rejects.toThrow('is not successful')
  expect(calls).toHaveLength(2)
})

test('rejects a missing current deployment without writes', async () => {
  const calls = mockApi({ environment: 'dev' }, page([deployment(199)]))
  await expect(deactivatePreviousDeployments(options)).rejects.toThrow('was not found')
  expect(calls).toHaveLength(2)
})

test('succeeds without writes when no previous successful deployments exist', async () => {
  const calls = mockApi({ environment: 'dev' }, page([deployment(200), deployment(199, 'INACTIVE')]))
  expect(await deactivatePreviousDeployments(options)).toBe(0)
  expect(calls).toHaveLength(2)
})

test('fails on a later GraphQL page without changing any statuses', async () => {
  const calls = mockApi(
    { environment: 'dev' },
    page([deployment(200), deployment(199)], 'next-page'),
    { errors: [{ message: 'Access denied' }] },
  )
  await expect(deactivatePreviousDeployments(options)).rejects.toThrow('Access denied')
  expect(calls).toHaveLength(3)
})

test('fails on HTTP errors', async () => {
  mockApi(new Response('', { status: 403, statusText: 'Forbidden' }))
  await expect(deactivatePreviousDeployments(options)).rejects.toThrow('403 Forbidden')
})

test('fails when a status update is rejected', async () => {
  const calls = mockApi(
    { environment: 'dev' }, page([deployment(200), deployment(199), deployment(198)]),
    new Response('', { status: 422, statusText: 'Unprocessable Entity' }),
  )
  await expect(deactivatePreviousDeployments(options)).rejects.toThrow('422')
  expect(calls).toHaveLength(3)
})

test('uses the runner API URLs for enterprise repositories', async () => {
  const calls = mockApi({ environment: 'dev' }, page([deployment(200), deployment(199)]), {})
  await deactivatePreviousDeployments({
    ...options,
    apiUrl: 'https://git.example.com/api/v3',
    graphqlUrl: 'https://git.example.com/api/graphql',
  })
  expect(calls.map(call => call.url)).toEqual([
    'https://git.example.com/api/v3/repos/owner/repo/deployments/200',
    'https://git.example.com/api/graphql',
    'https://git.example.com/api/v3/repos/owner/repo/deployments/199/statuses',
  ])
})

test.each(['', 'invalid', '../200', '0'])('rejects invalid deployment ID %s before calling the API', async currentDeploymentId => {
  const calls = mockApi()
  await expect(deactivatePreviousDeployments({ ...options, currentDeploymentId })).rejects.toThrow('positive database ID')
  expect(calls).toHaveLength(0)
})

test('requires a token', async () => {
  await expect(deactivatePreviousDeployments({ ...options, token: '' })).rejects.toThrow('token is required')
})

const entryPoint = new URL('../../actions/deactivate-previous-deployments/index.mjs', import.meta.url).pathname

test('Node.js entry point reads runner inputs and authenticates API calls', async () => {
  const requests: { path: string; authorization: string | null }[] = []
  const responses = [{ environment: 'prod' }, page([deployment(200), deployment(199)]), {}]
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      requests.push({ path: new URL(request.url).pathname, authorization: request.headers.get('Authorization') })
      return Response.json(responses.shift())
    },
  })
  try {
    const child = Bun.spawn(['node', entryPoint], {
      env: {
        ...process.env,
        'INPUT_CURRENT-DEPLOYMENT-ID': '200',
        INPUT_TOKEN: 'test-token',
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_API_URL: server.url.origin,
        GITHUB_GRAPHQL_URL: `${server.url.origin}/graphql`,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    expect(await child.exited).toBe(0)
    expect(await new Response(child.stdout).text()).toContain('Deactivated 1 previous deployment(s).')
    expect(requests.map(request => request.path)).toEqual([
      '/repos/owner/repo/deployments/200', '/graphql', '/repos/owner/repo/deployments/199/statuses',
    ])
    expect(requests.every(request => request.authorization === 'Bearer test-token')).toBe(true)
  } finally {
    server.stop(true)
  }
})

test('Node.js entry point fails the action for invalid inputs', async () => {
  const child = Bun.spawn(['node', entryPoint], {
    env: { ...process.env, 'INPUT_CURRENT-DEPLOYMENT-ID': '' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  expect(await child.exited).toBe(1)
  expect(await new Response(child.stderr).text()).toContain('positive database ID')
})
