import type { components } from '@octokit/openapi-types/types'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { keyBy, orderBy } from 'lodash-es'
import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { DeploymentState } from '../generated/graphql'
import type { DeployFragment, RepoFragment } from '../generated/graphql'
import { useAppState } from '../store'
import type { DeploymentModel, ReleaseModel } from '../store'
import {
  createGraphQLApi,
  createOctokit,
  getGitHubQueryScope,
  githubQueryKeys,
} from './githubRuntime'
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
import {
  inferDeployWorkflowInputs,
  parseWorkflowDispatch,
  type DeployWorkflowInputs,
  type WorkflowDispatchInputs,
} from './workflowDispatch'

const REPO_STALE_TIME_MS = 30 * 60 * 1000
const REPO_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type RepoPage = {
  repos: RepoModel[]
  nextCursor: string | null
  totalCount: number
}

type RepoCachePage = RepoPage & { savedAt: number }

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
export type DispatchWorkflow = Workflow & {
  dispatchInputs?: WorkflowDispatchInputs
  deployInputs?: DeployWorkflowInputs
}

export const useFetchWorkflows = ({
  manualWorkflowHandling,
}: {
  manualWorkflowHandling?: boolean
} = {}) => {
  const { activeAccountId, token, selectedApplication } = useAppState()
  const scope = getGitHubQueryScope({ activeAccountId, token })

  const repo = selectedApplication?.repo
  const useManualWorkflowHandling =
    manualWorkflowHandling ??
    selectedApplication?.deploySettings.manualWorkflowHandling ??
    false

  const { data, isLoading, error } = useQuery({
    queryKey: githubQueryKeys.workflows(
      scope,
      repo,
      useManualWorkflowHandling
    ),
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
      const workflows = response.filter(isFileBackedWorkflow)

      if (useManualWorkflowHandling) {
        return orderBy(workflows, (w) => w.name)
      }

      return orderBy(
        await filterDeployWorkflows(workflows, async (workflow) => {
          const workflowFile = await fetchWorkflowFile({
            octokit,
            owner,
            repo: name,
            path: workflow.path,
            ref: repo.defaultBranch,
            signal,
          })

          return parseWorkflowDispatch(workflowFile)
        }),
        (w) => w.name
      )
    },
  })
  return { data, isLoading, error }
}

type WorkflowInspectionResult =
  | { status: 'deploy'; workflow: DispatchWorkflow }
  | { status: 'not-deploy' }
  | { status: 'failed' }

async function filterDeployWorkflows(
  workflows: Workflow[],
  inspectWorkflow: (
    workflow: Workflow
  ) => Promise<{ inputs: WorkflowDispatchInputs } | null>
): Promise<DispatchWorkflow[]> {
  const inspectedWorkflows = await Promise.all(
    workflows.map(async (workflow): Promise<WorkflowInspectionResult> => {
      try {
        const dispatch = await inspectWorkflow(workflow)
        const deployInputs = dispatch
          ? inferDeployWorkflowInputs(dispatch.inputs)
          : undefined

        return deployInputs
          ? {
              status: 'deploy',
              workflow: {
                ...workflow,
                dispatchInputs: dispatch!.inputs,
                deployInputs,
              },
            }
          : { status: 'not-deploy' }
      } catch {
        return { status: 'failed' }
      }
    })
  )

  const deployWorkflows = inspectedWorkflows.flatMap((workflow) =>
    workflow.status === 'deploy' ? [workflow.workflow] : []
  )

  if (deployWorkflows.length > 0) return deployWorkflows

  if (inspectedWorkflows.some((workflow) => workflow.status === 'failed')) {
    return workflows
  }

  return []
}

function isFileBackedWorkflow(workflow: Workflow) {
  return workflow.path.toLowerCase().startsWith('.github/workflows/')
}

async function fetchWorkflowFile({
  octokit,
  owner,
  repo,
  path,
  ref,
  signal,
}: {
  octokit: ReturnType<typeof createOctokit>
  owner: string
  repo: string
  path: string
  ref: string
  signal: AbortSignal
}) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
    mediaType: { format: 'raw' },
    request: { signal },
  })

  if (typeof data === 'string') return data

  if (isFileContent(data) && data.encoding === 'base64') {
    return decodeBase64(data.content)
  }

  throw new Error(`Could not load workflow file ${path}`)
}

function isFileContent(
  data: unknown
): data is { content: string; encoding: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    'content' in data &&
    typeof data.content === 'string' &&
    'encoding' in data &&
    typeof data.encoding === 'string'
  )
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return new TextDecoder().decode(bytes)
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
  const scope = getGitHubQueryScope({ activeAccountId, token })
  const cachedPage = useMemo(
    () => loadRepoCache(scope.repoCacheKey),
    [scope.repoCacheKey]
  )

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
    if (!scope.repoCacheKey || !query.data?.pages.length) return

    saveRepoCache(scope.repoCacheKey, buildRepoCache(query.data.pages))
  }, [query.data, scope.repoCacheKey])

  const repos = collectRepos(query.data?.pages ?? [])
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

function buildRepoCache(pages: RepoPage[]): RepoCachePage {
  const lastPage = pages.at(-1)

  return {
    savedAt: Date.now(),
    repos: collectRepos(pages),
    nextCursor: lastPage?.nextCursor ?? null,
    totalCount: lastPage?.totalCount ?? 0,
  }
}

function loadRepoCache(cacheKey: string): RepoCachePage | undefined {
  if (!cacheKey || typeof localStorage === 'undefined') return undefined

  const value = localStorage.getItem(getRepoCacheStorageKey(cacheKey))
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

function saveRepoCache(cacheKey: string, cache: RepoCachePage) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(
      getRepoCacheStorageKey(cacheKey),
      JSON.stringify(cache)
    )
  } catch (error) {
    console.error('Could not save repository cache', error)
  }
}

function getRepoCacheStorageKey(cacheKey: string) {
  return `gdc.v2.repos.${cacheKey}`
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
