import type { components } from '@octokit/openapi-types/types'
import { Octokit } from '@octokit/rest'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { GraphQLClient } from 'graphql-request'
import { keyBy, orderBy } from 'lodash-es'
import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { DeploymentState, getSdk } from '../generated/graphql'
import type { DeployFragment, RepoFragment } from '../generated/graphql'
import { useAppState } from '../store'
import type { DeploymentModel, ReleaseModel } from '../store'
import {
  githubEnvironmentsSchema,
  repoSchema,
  workflowRunsSchema,
} from '../state/schemas'
import type {
  GitHubEnvironment,
  RepoModel,
  WorkflowRun,
} from '../state/schemas'

const REPO_STALE_TIME_MS = 30 * 60 * 1000
const REPO_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql'

export type GitHubQueryScope = {
  activeAccountId: string
  tokenKey: string
}

export const getGitHubQueryScope = ({
  activeAccountId,
  token,
}: {
  activeAccountId: string
  token: string
}): GitHubQueryScope => ({
  activeAccountId,
  tokenKey: token ? hashString(token) : '',
})

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

type RepoPage = {
  repos: RepoModel[]
  nextCursor: string | null
  totalCount: number
}

const repoCacheSchema = z.object({
  savedAt: z.number(),
  repos: z.array(repoSchema),
  nextCursor: z.string().nullable(),
  totalCount: z.number(),
})

export const useFetchReleases = () => {
  const { activeAccountId, selectedApplication, settings, token } = useAppState()
  const refreshIntervalSecs = settings.refreshIntervalSecs
  const scope = getGitHubQueryScope({ activeAccountId, token })

  const repo = selectedApplication?.repo
  const prefix = selectedApplication?.releaseFilter ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: githubQueryKeys.releases(scope, repo, prefix),
    enabled: !!token && !!repo,
    queryFn: async ({ signal }) => {
      if (!token || !repo) return []

      const result = await createGraphQLApi(token).fetchReleases(
        {
          repoName: repo.name,
          repoOwner: repo.owner,
          prefix,
        },
        undefined,
        signal
      )
      const fragments = result.repository?.refs?.nodes?.map((n) => n!) ?? []
      const releases = fragments
        .map(({ id, name, target }): ReleaseModel | null =>
          target?.__typename === 'Commit'
            ? {
                id,
                name,
                tagName: name,
                createdAt: dayjs(target.pushedDate ?? target.committedDate),
                commit: target.oid,
                deployments:
                  target.deployments?.nodes
                    ?.filter((node) => !!node)
                    .map((n) => n! as DeployFragment)
                    .map(
                      ({
                        id,
                        createdAt,
                        environment,
                        state,
                        latestStatus,
                        payload,
                        databaseId,
                      }): DeploymentModel => ({
                        id,
                        databaseId: databaseId || undefined,
                        createdAt: dayjs(createdAt),
                        environment: environment || '',
                        state: state || DeploymentState.Inactive,
                        modifiedAt: dayjs(latestStatus?.createdAt),
                        workflowRunId: tryParseWorkflowRunId(payload),
                      })
                    )
                    .orderBy((n) => n.createdAt, 'desc') || [],
              }
            : null
        )
        .filter((n): n is ReleaseModel => !!n)
      return releases
    },
    refetchInterval: 1000 * refreshIntervalSecs,
  })

  return { data, isLoading, error }
}

type Workflow = components['schemas']['workflow']

export const useFetchWorkflows = () => {
  const { activeAccountId, token, selectedApplication } = useAppState()
  const scope = getGitHubQueryScope({ activeAccountId, token })

  const repo = selectedApplication?.repo

  const { data, isLoading, error } = useQuery({
    queryKey: githubQueryKeys.workflows(scope, repo),
    enabled: !!token && !!repo,
    queryFn: async ({ signal }) => {
      if (!token || !repo) return []

      const { owner, name } = repo
      const octokit = createOctokit(token)

      const response = await octokit.paginate(
        octokit.actions.listRepoWorkflows,
        {
          owner,
          repo: name,
          per_page: 100,
          request: { signal },
        },
        (response) => response.data as Workflow[]
      )

      // TODO: Only return workflows with `workflow_dispatch` trigger
      return orderBy(response, (w) => w.name)
    },
  })
  return { data, isLoading, error }
}

export const useFetchWorkflowRuns = (): UseQueryResult<
  Record<number, WorkflowRun>
> => {
  const { activeAccountId, token, selectedApplication, settings } =
    useAppState()
  const scope = getGitHubQueryScope({ activeAccountId, token })
  const workflowRuns = settings.workflowRuns

  const repo = selectedApplication?.repo
  const workflowId = selectedApplication?.deploySettings?.workflowId
  return useQuery({
    queryKey: githubQueryKeys.workflowRuns(
      scope,
      repo,
      workflowId,
      workflowRuns
    ),
    enabled: !!token && !!repo && !!workflowId,
    queryFn: async ({ signal }) => {
      if (!token || !repo || !workflowId) return {}

      const { owner, name } = repo

      const { data } = await createOctokit(token).actions.listWorkflowRuns({
        workflow_id: workflowId,
        owner,
        repo: name,
        per_page: workflowRuns,
        request: { signal },
      })

      let workflows: WorkflowRun[] = []

      try {
        workflows = workflowRunsSchema.parse(data.workflow_runs)
      } catch (error) {
        console.error(error)
      }

      return keyBy(workflows, 'id') as Record<number, WorkflowRun>
    },
  })
}

export const useFetchEnvironments = (): UseQueryResult<GitHubEnvironment[]> => {
  const { activeAccountId, token, selectedApplication } = useAppState()
  const scope = getGitHubQueryScope({ activeAccountId, token })

  const repo = selectedApplication?.repo

  return useQuery({
    queryKey: githubQueryKeys.environments(scope, repo),
    enabled: !!token && !!repo,
    queryFn: async ({ signal }) => {
      if (!token || !repo) return []
      const { owner, name } = repo
      const octokit = createOctokit(token)

      const data = await octokit.paginate(
        octokit.repos.getAllEnvironments,
        {
          owner,
          repo: name,
          per_page: 100,
          request: { signal },
        },
        (response) => response.data as any
      )
      try {
        return githubEnvironmentsSchema.parse(data)
      } catch (error) {
        console.error(error)
        return []
      }
    },
  })
}

export const useFetchRepos = ({
  autoFetchAll = false,
}: { autoFetchAll?: boolean } = {}) => {
  const { activeAccountId, token } = useAppState()
  const scope = useMemo(
    () => getGitHubQueryScope({ activeAccountId, token }),
    [activeAccountId, token]
  )
  const cachedPage = useMemo(() => loadRepoCache(scope.tokenKey), [scope.tokenKey])

  const query = useInfiniteQuery({
    queryKey: githubQueryKeys.repos(scope),
    enabled: !!token,
    staleTime: REPO_STALE_TIME_MS,
    gcTime: REPO_CACHE_MAX_AGE_MS,
    initialPageParam: null as string | null,
    initialData: cachedPage
      ? {
          pages: [cachedPage],
          pageParams: [null],
        }
      : undefined,
    initialDataUpdatedAt: cachedPage?.savedAt,
    queryFn: ({ pageParam, signal }) =>
      fetchRepoPage(token, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  useEffect(() => {
    if (
      !autoFetchAll ||
      !token ||
      !query.hasNextPage ||
      query.isFetching
    ) {
      return
    }

    void query.fetchNextPage({ cancelRefetch: false })
  }, [
    autoFetchAll,
    token,
    query.data?.pages.length,
    query.fetchNextPage,
    query.hasNextPage,
    query.isFetching,
  ])

  useEffect(() => {
    if (!scope.tokenKey || !query.data?.pages.length) return

    saveRepoCache(scope.tokenKey, buildRepoCache(query.data.pages))
  }, [query.data, scope.tokenKey])

  const repos = useMemo(
    () => collectRepos(query.data?.pages ?? []),
    [query.data?.pages]
  )
  const lastPage = query.data?.pages.at(-1)
  const totalCount = lastPage?.totalCount

  return {
    ...query,
    data: repos,
    loadedCount: repos.length,
    totalCount,
    isInitialLoading: query.isLoading && repos.length === 0,
    isRefreshing:
      query.isFetching &&
      !query.isFetchingNextPage &&
      repos.length > 0 &&
      !query.isLoading,
  }
}

function createGraphQLApi(token: string) {
  const client = new GraphQLClient(GITHUB_GRAPHQL_API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return getSdk(client)
}

function createOctokit(token: string) {
  return new Octokit({ auth: token })
}

async function fetchRepoPage(
  token: string,
  after: string | null,
  signal: AbortSignal
): Promise<RepoPage> {
  const result = await createGraphQLApi(token).fetchReposWithWriteAccess(
    { after },
    undefined,
    signal
  )
  const repositories = result.viewer.repositories
  const { hasNextPage, endCursor } = repositories.pageInfo
  const repos = repositories.nodes?.map((repo) =>
    toRepoModel(repo as RepoFragment)
  )

  return {
    repos: repos ?? [],
    nextCursor: hasNextPage ? (endCursor as string | null) : null,
    totalCount: repositories.totalCount,
  }
}

function toRepoModel(repo: RepoFragment): RepoModel {
  return {
    id: repo.id,
    name: repo.name,
    owner: repo.owner.login,
    defaultBranch: repo.defaultBranchRef?.name ?? '',
  }
}

function collectRepos(pages: RepoPage[]): RepoModel[] {
  const reposById = new Map<string, RepoModel>()

  for (const repo of pages.flatMap((page) => page.repos)) {
    reposById.set(repo.id, repo)
  }

  return [...reposById.values()]
}

function buildRepoCache(pages: RepoPage[]): RepoPage & { savedAt: number } {
  const lastPage = pages.at(-1)

  return {
    savedAt: Date.now(),
    repos: collectRepos(pages),
    nextCursor: lastPage?.nextCursor ?? null,
    totalCount: lastPage?.totalCount ?? 0,
  }
}

function loadRepoCache(
  tokenKey: string
): (RepoPage & { savedAt: number }) | undefined {
  if (!tokenKey || typeof localStorage === 'undefined') return undefined

  const value = localStorage.getItem(getRepoCacheStorageKey(tokenKey))
  if (!value) return undefined

  try {
    const cache = repoCacheSchema.parse(JSON.parse(value))
    if (Date.now() - cache.savedAt > REPO_CACHE_MAX_AGE_MS) return undefined
    return cache
  } catch (error) {
    console.error('Could not load repository cache', error)
    return undefined
  }
}

function saveRepoCache(
  tokenKey: string,
  cache: RepoPage & { savedAt: number }
) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(
      getRepoCacheStorageKey(tokenKey),
      JSON.stringify(cache)
    )
  } catch (error) {
    console.error('Could not save repository cache', error)
  }
}

function getRepoCacheStorageKey(tokenKey: string) {
  return `gdc.v2.repos.${tokenKey}`
}

export function hashString(value: string) {
  let hash = 5381

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }

  return (hash >>> 0).toString(36)
}

function tryParseWorkflowRunId(payload: string | null): number | undefined {
  if (!payload) return undefined
  try {
    // The payload is a JSON string that contains a JSON string, apparently??
    const parsed = JSON.parse(JSON.parse(payload))
    return parseInt(parsed.workflow_run_id)
  } catch (e) {
    return undefined
  }
}
