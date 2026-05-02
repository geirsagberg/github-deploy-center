import { expect, test as base } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

export const STORAGE_KEY = 'gdc.v2.state'
export const FAKE_TOKEN = 'ghp_e2e_fake'
export const E2E_ACCOUNT_ID = 'e2e-account'
export const E2E_USER = {
  id: 'U_e2e_user',
  login: 'e2e-user',
}
export const E2E_REPO = {
  id: 'R_e2e_repo',
  owner: 'octo-org',
  name: 'deploy-center-fixture',
  defaultBranch: 'main',
}
export const E2E_WORKFLOW = {
  id: 42,
  name: 'Deploy fixture app',
  path: '.github/workflows/deploy.yml',
}
export const E2E_NON_DISPATCH_WORKFLOW = {
  id: 43,
  name: 'Build fixture app',
  path: '.github/workflows/build.yml',
}
export const E2E_APPLICATION_ID = 'e2e-application'

const E2E_WORKFLOW_FILES: Record<string, string> = {
  [E2E_WORKFLOW.path]: `
name: ${E2E_WORKFLOW.name}
on:
  workflow_dispatch:
    inputs:
      release_version:
        description: Release to deploy
      deploy_target:
        type: environment
`,
  [E2E_NON_DISPATCH_WORKFLOW.path]: `
name: ${E2E_NON_DISPATCH_WORKFLOW.name}
on: push
`,
}

type PersistedApplication = {
  id: string
  name: string
  releaseFilter: string
  repo: typeof E2E_REPO
  deploySettings: {
    type: 'workflow'
    environmentKey: string
    releaseKey: string
    workflowId: number
    ref: string
    extraArgs: Record<string, string>
  }
  environmentSettingsByName: Record<
    string,
    {
      name: string
      workflowInputValue: string
    }
  >
}

type PersistedStateOptions = {
  applicationsById?: Record<string, PersistedApplication>
  selectedApplicationId?: string
  pendingDeployments?: Record<string, { createdAt: string }>
}

type DispatchRequest = {
  owner: string
  repo: string
  workflowId: string
  body: unknown
}

type GraphQLRequest = {
  operation: string
  variables: Record<string, unknown>
}

class GitHubMock {
  readonly dispatchRequests: DispatchRequest[] = []
  readonly graphqlRequests: GraphQLRequest[] = []
  readonly restRequests: string[] = []
  readonly unexpectedRequests: string[] = []

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route('https://api.github.com/**', async (route) => {
      try {
        await this.handleGitHubRequest(route)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.unexpectedRequests.push(message)
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message }),
        })
      }
    })
  }

  async seedAuthenticatedState(options: PersistedStateOptions = {}) {
    await this.page.addInitScript(
      ({ key, state }) => {
        localStorage.setItem(key, JSON.stringify(state))
      },
      {
        key: STORAGE_KEY,
        state: buildPersistedState(options),
      }
    )
  }

  async readPersistedState() {
    return this.page.evaluate((key) => {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : undefined
    }, STORAGE_KEY)
  }

  operationCount(operation: string) {
    return this.graphqlRequests.filter(
      (request) => request.operation === operation
    ).length
  }

  private async handleGitHubRequest(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    assertFakeToken(request)

    if (url.pathname === '/graphql' && request.method() === 'POST') {
      await this.handleGraphQLRequest(route)
      return
    }

    if (request.method() === 'GET' && isWorkflowRunsPath(url.pathname)) {
      this.restRequests.push(url.pathname)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 0,
          workflow_runs: [],
        }),
      })
      return
    }

    if (request.method() === 'GET' && isWorkflowsPath(url.pathname)) {
      this.restRequests.push(url.pathname)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 2,
          workflows: [
            toRestWorkflow(E2E_WORKFLOW, request.url()),
            toRestWorkflow(E2E_NON_DISPATCH_WORKFLOW, request.url()),
          ],
        }),
      })
      return
    }

    if (request.method() === 'GET' && isContentPath(url.pathname)) {
      const workflowPath = getContentPath(url.pathname)
      const workflowFile = E2E_WORKFLOW_FILES[workflowPath]

      if (!workflowFile) {
        throw new Error(`Unexpected workflow file: ${workflowPath}`)
      }

      this.restRequests.push(url.pathname)
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: workflowFile,
      })
      return
    }

    if (request.method() === 'GET' && isEnvironmentsPath(url.pathname)) {
      this.restRequests.push(url.pathname)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 2,
          environments: [{ name: 'dev' }, { name: 'prod' }],
        }),
      })
      return
    }

    if (request.method() === 'POST' && isWorkflowDispatchPath(url.pathname)) {
      const [, owner, repo, workflowId] =
        url.pathname.match(
          /^\/repos\/([^/]+)\/([^/]+)\/actions\/workflows\/([^/]+)\/dispatches$/
        ) ?? []
      this.dispatchRequests.push({
        owner,
        repo,
        workflowId,
        body: JSON.parse(request.postData() ?? '{}'),
      })
      await route.fulfill({ status: 204 })
      return
    }

    throw new Error(`Unexpected GitHub request: ${request.method()} ${url}`)
  }

  private async handleGraphQLRequest(route: Route) {
    const request = route.request()
    const body = JSON.parse(request.postData() ?? '{}') as {
      query?: string
      variables?: Record<string, unknown>
    }
    const query = body.query ?? ''
    const variables = body.variables ?? {}

    if (query.includes('githubIdentity')) {
      this.graphqlRequests.push({ operation: 'githubIdentity', variables })
      await fulfillGraphQL(route, {
        viewer: E2E_USER,
      })
      return
    }

    if (query.includes('fetchReposWithWriteAccess')) {
      this.graphqlRequests.push({
        operation: 'fetchReposWithWriteAccess',
        variables,
      })
      await fulfillGraphQL(route, {
        viewer: {
          repositories: {
            totalCount: 1,
            nodes: [toGraphQLRepo(E2E_REPO)],
            pageInfo: {
              endCursor: null,
              hasNextPage: false,
            },
          },
        },
      })
      return
    }

    if (query.includes('fetchReleases')) {
      this.graphqlRequests.push({ operation: 'fetchReleases', variables })
      await fulfillGraphQL(route, {
        repository: {
          refs: {
            nodes: [
              {
                id: 'REF_v1_2_3',
                name: 'v1.2.3',
                target: {
                  __typename: 'Commit',
                  oid: 'abc123',
                  pushedDate: '2026-05-01T09:00:00Z',
                  committedDate: '2026-05-01T08:55:00Z',
                  deployments: {
                    nodes: [],
                  },
                },
              },
              {
                id: 'REF_v1_2_2',
                name: 'v1.2.2',
                target: {
                  __typename: 'Commit',
                  oid: 'def456',
                  pushedDate: '2026-04-30T09:00:00Z',
                  committedDate: '2026-04-30T08:55:00Z',
                  deployments: {
                    nodes: [],
                  },
                },
              },
            ],
          },
        },
      })
      return
    }

    throw new Error(`Unexpected GraphQL operation: ${query}`)
  }
}

export const test = base.extend<{ github: GitHubMock }>({
  github: async ({ page }, use) => {
    const github = new GitHubMock(page)
    await github.install()
    await use(github)
    expect(github.unexpectedRequests).toEqual([])
  },
})

export { expect } from '@playwright/test'

export function createPersistedApplication(): PersistedApplication {
  return {
    id: E2E_APPLICATION_ID,
    name: 'Fixture App',
    releaseFilter: 'v',
    repo: E2E_REPO,
    deploySettings: {
      type: 'workflow',
      environmentKey: 'environment',
      releaseKey: 'ref',
      workflowId: E2E_WORKFLOW.id,
      ref: 'main',
      extraArgs: {},
    },
    environmentSettingsByName: {
      dev: {
        name: 'dev',
        workflowInputValue: 'dev',
      },
    },
  }
}

function buildPersistedState({
  applicationsById = {},
  selectedApplicationId = '',
  pendingDeployments = {},
}: PersistedStateOptions) {
  return {
    accountsById: {
      [E2E_ACCOUNT_ID]: {
        id: E2E_ACCOUNT_ID,
        token: FAKE_TOKEN,
        githubLogin: E2E_USER.login,
        githubUserId: E2E_USER.id,
        workspace: {
          applicationsById,
          selectedApplicationId,
          pendingDeployments,
        },
      },
    },
    activeAccountId: E2E_ACCOUNT_ID,
    settings: {
      deployTimeoutSecs: 60,
      refreshIntervalSecs: 60,
      workflowRuns: 100,
    },
  }
}

function assertFakeToken(request: Request) {
  const authorization = request.headers().authorization
  if (authorization !== `Bearer ${FAKE_TOKEN}`) {
    throw new Error(
      `Expected fake PAT authorization header for ${request.method()} ${request.url()}, got ${authorization ?? '<missing>'}`
    )
  }
}

function toGraphQLRepo(repo: typeof E2E_REPO) {
  return {
    id: repo.id,
    name: repo.name,
    owner: {
      login: repo.owner,
    },
    defaultBranchRef: {
      name: repo.defaultBranch,
    },
  }
}

function toRestWorkflow(
  workflow: typeof E2E_WORKFLOW | typeof E2E_NON_DISPATCH_WORKFLOW,
  requestUrl: string
) {
  const workflowUrl = `https://github.com/${E2E_REPO.owner}/${E2E_REPO.name}/actions/workflows/${workflow.path}`

  return {
    id: workflow.id,
    name: workflow.name,
    path: workflow.path,
    state: 'active',
    html_url: workflowUrl,
    badge_url: `${workflowUrl}/badge.svg`,
    created_at: '2026-05-01T08:00:00Z',
    updated_at: '2026-05-01T08:00:00Z',
    url: requestUrl,
  }
}

async function fulfillGraphQL(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  })
}

function isWorkflowsPath(pathname: string) {
  return /^\/repos\/[^/]+\/[^/]+\/actions\/workflows$/.test(pathname)
}

function isWorkflowRunsPath(pathname: string) {
  return /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/runs$/.test(
    pathname
  )
}

function isWorkflowDispatchPath(pathname: string) {
  return /^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/dispatches$/.test(
    pathname
  )
}

function isContentPath(pathname: string) {
  return /^\/repos\/[^/]+\/[^/]+\/contents\/.+$/.test(pathname)
}

function getContentPath(pathname: string) {
  const [, path] =
    pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/) ?? []

  return decodeURIComponent(path ?? '')
}

function isEnvironmentsPath(pathname: string) {
  return /^\/repos\/[^/]+\/[^/]+\/environments$/.test(pathname)
}
