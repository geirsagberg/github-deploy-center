import { components } from '@octokit/openapi-types/types'
import { UseQueryResult, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { keyBy, orderBy } from 'lodash-es'
import { useRecoilValue } from 'recoil'
import {
  DeployFragment,
  DeploymentState,
  RepoFragment,
} from '../generated/graphql'
import { useAppState, useEffects } from '../overmind'
import { DeploymentModel, ReleaseModel } from '../overmind/state'
import { appSettings } from '../state'
import {
  GitHubEnvironment,
  RepoModel,
  WorkflowRun,
  githubEnvironmentsSchema,
  workflowRunsSchema,
} from '../state/schemas'
import graphQLApi from '../utils/graphQLApi'

export const useFetchReleases = () => {
  const { selectedApplication } = useAppState()
  const refreshIntervalSecs = useRecoilValue(appSettings.refreshIntervalSecs)

  const repo = selectedApplication?.repo
  const prefix = selectedApplication?.releaseFilter ?? ''

  const { data, isLoading, error } = useQuery(
    [`${repo?.owner}/${repo?.name}/releases/${prefix}`],
    async () => {
      if (!repo) return []

      const result = await graphQLApi.fetchReleases({
        repoName: repo.name,
        repoOwner: repo.owner,
        prefix,
      })
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
    {
      refetchInterval: 1000 * refreshIntervalSecs,
    }
  )

  return { data, isLoading, error }
}

type Workflow = components['schemas']['workflow']

export const useFetchWorkflows = () => {
  const { token, selectedApplication } = useAppState()
  const { restApi } = useEffects()

  const repo = selectedApplication?.repo

  const { data, isLoading, error } = useQuery(
    [`${repo?.owner}/${repo?.name}/workflows`],
    async () => {
      if (!token || !repo) return []

      const { owner, name } = repo

      const response = await restApi.octokit.paginate(
        restApi.octokit.actions.listRepoWorkflows,
        {
          owner,
          repo: name,
          per_page: 100,
        },
        (response) => response.data as Workflow[]
      )

      // TODO: Only return workflows with `workflow_dispatch` trigger
      return orderBy(response, (w) => w.name)
    }
  )
  return { data, isLoading, error }
}

export const useFetchWorkflowRuns = (): UseQueryResult<
  Record<number, WorkflowRun>
> => {
  const { token, selectedApplication } = useAppState()
  const { restApi } = useEffects()
  const workflowRuns = useRecoilValue(appSettings.workflowRuns)

  const repo = selectedApplication?.repo
  const workflowId = selectedApplication?.deploySettings?.workflowId
  return useQuery([`${repo?.owner}/${repo?.name}/workflow-runs`], async () => {
    if (!token || !repo || !workflowId) return []

    const { owner, name } = repo

    const { data } = await restApi.octokit.actions.listWorkflowRuns({
      workflow_id: workflowId,
      owner,
      repo: name,
      per_page: workflowRuns,
    })

    let workflows: WorkflowRun[] = []

    try {
      workflows = workflowRunsSchema.parse(data.workflow_runs)
    } catch (error) {
      console.error(error)
    }

    return keyBy(workflows, 'id') as Record<number, WorkflowRun>
  })
}

export const useFetchEnvironments = (): UseQueryResult<GitHubEnvironment[]> => {
  const { token, selectedApplication } = useAppState()
  const { restApi } = useEffects()

  const repo = selectedApplication?.repo

  return useQuery([`${repo?.owner}/${repo?.name}/environments`], async () => {
    if (!token || !repo) return []
    const { owner, name } = repo

    const data = await restApi.octokit.paginate(
      restApi.octokit.repos.getAllEnvironments,
      {
        owner,
        repo: name,
        per_page: 100,
      },
      (response) => response.data as any
    )
    try {
      return githubEnvironmentsSchema.parse(data)
    } catch (error) {
      console.error(error)
      return []
    }
  })
}

export const useFetchRepos = () =>
  useQuery(['repos'], async () => {
    let after: string | null = null
    let keepFetching = true
    const repos: RepoFragment[] = []
    while (keepFetching) {
      const result = await graphQLApi.fetchReposWithWriteAccess({
        after,
      })
      const { hasNextPage, endCursor } = result.viewer.repositories.pageInfo
      const nodes =
        result.viewer.repositories.nodes?.map((e) => e as RepoFragment) ?? []
      repos.push(...nodes)
      keepFetching = hasNextPage
      after = endCursor as string | null
    }
    return repos.map(
      (r): RepoModel => ({
        id: r.id,
        name: r.name,
        owner: r.owner.login,
        defaultBranch: r.defaultBranchRef?.name ?? '',
      })
    )
  })

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
