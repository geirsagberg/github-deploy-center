const query = `query($owner: String!, $name: String!, $environment: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    deployments(
      first: 100
      after: $cursor
      environments: [$environment]
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      nodes {
        databaseId
        latestStatus { state }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export async function deactivatePreviousDeployments({
  currentDeploymentId,
  token,
  repository,
  apiUrl = 'https://api.github.com',
  graphqlUrl = 'https://api.github.com/graphql',
}) {
  if (!/^[1-9]\d*$/.test(currentDeploymentId ?? '')) {
    throw new Error('current-deployment-id must be a positive database ID.')
  }
  if (!token) throw new Error('token is required.')
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must contain owner/repository.')
  }

  async function request(url, body) {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`)
    }
    const result = await response.json()
    if (result.errors?.length) {
      throw new Error(`GitHub GraphQL request failed: ${result.errors.map(error => error.message).join('; ')}`)
    }
    return result
  }

  const deploymentsUrl = `${apiUrl}/repos/${repository}/deployments`
  const current = await request(`${deploymentsUrl}/${currentDeploymentId}`)
  const [owner, name] = repository.split('/')
  const previousIds = []
  let foundCurrent = false
  let cursor = null

  // Read every page and validate the current deployment before changing any statuses.
  do {
    const result = await request(graphqlUrl, {
      query,
      variables: { owner, name, environment: current.environment, cursor },
    })
    const deployments = result.data?.repository?.deployments
    if (!deployments) throw new Error('GitHub returned no deployments connection.')

    for (const deployment of deployments.nodes) {
      if (String(deployment.databaseId) === String(currentDeploymentId)) {
        if (deployment.latestStatus?.state !== 'SUCCESS') {
          throw new Error(`Current deployment ${currentDeploymentId} is not successful.`)
        }
        foundCurrent = true
      } else if (foundCurrent && deployment.latestStatus?.state === 'SUCCESS') {
        previousIds.push(deployment.databaseId)
      }
    }
    cursor = deployments.pageInfo.hasNextPage ? deployments.pageInfo.endCursor : null
  } while (cursor)

  if (!foundCurrent) {
    throw new Error(`Current deployment ${currentDeploymentId} was not found in environment ${current.environment}.`)
  }

  for (const id of previousIds) {
    await request(`${deploymentsUrl}/${id}/statuses`, {
      state: 'inactive',
      description: `Superseded by deployment ${currentDeploymentId}`,
      auto_inactive: false,
    })
  }
  return previousIds.length
}
