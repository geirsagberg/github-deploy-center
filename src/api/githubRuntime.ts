import { GraphQLClient } from 'graphql-request'
import { getSdk } from '../generated/graphql'
import type { RepoModel } from '../state/schemas'
import { createBearerOctokit } from './octokit'

const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql'

export type GitHubQueryScope = {
  activeAccountId: string
  tokenKey: string
  repoCacheKey: string
}

export const getGitHubQueryScope = ({
  activeAccountId,
  token,
}: {
  activeAccountId: string
  token: string
}): GitHubQueryScope => ({
  activeAccountId,
  ...getGitHubTokenScope(activeAccountId, token),
})

function getGitHubTokenScope(activeAccountId: string, token: string) {
  const tokenKey = token ? hashString(token) : ''

  return {
    tokenKey,
    repoCacheKey:
      activeAccountId && tokenKey ? `${activeAccountId}:${tokenKey}` : '',
  }
}

export const githubQueryKeys = {
  releases: (
    scope: GitHubQueryScope,
    repo: RepoModel | undefined,
    prefix: string
  ) =>
    [
      'github',
      'releases',
      scope.activeAccountId,
      scope.tokenKey,
      repo?.owner,
      repo?.name,
      prefix,
    ] as const,
  workflows: (scope: GitHubQueryScope, repo: RepoModel | undefined) =>
    [
      'github',
      'workflows',
      scope.activeAccountId,
      scope.tokenKey,
      repo?.owner,
      repo?.name,
      repo?.defaultBranch,
    ] as const,
  workflowRuns: (
    scope: GitHubQueryScope,
    repo: RepoModel | undefined,
    workflowId: number | undefined,
    workflowRuns: number
  ) =>
    [
      'github',
      'workflow-runs',
      scope.activeAccountId,
      scope.tokenKey,
      repo?.owner,
      repo?.name,
      workflowId,
      workflowRuns,
    ] as const,
  environments: (scope: GitHubQueryScope, repo: RepoModel | undefined) =>
    [
      'github',
      'environments',
      scope.activeAccountId,
      scope.tokenKey,
      repo?.owner,
      repo?.name,
    ] as const,
  repos: (scope: GitHubQueryScope) =>
    ['github', 'repos', scope.activeAccountId, scope.tokenKey] as const,
}

export function createGraphQLApi(token: string) {
  const client = new GraphQLClient(GITHUB_GRAPHQL_API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return getSdk(client)
}

export function createOctokit(token: string) {
  return createBearerOctokit(token)
}

export function hashString(value: string) {
  let hash = 5381

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }

  return (hash >>> 0).toString(36)
}
