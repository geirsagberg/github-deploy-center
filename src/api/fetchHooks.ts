import { components } from '@octokit/openapi-types/types'
import dayjs from 'dayjs'
import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { orderBy } from 'lodash-es'
import { useQuery } from 'react-query'
import {
  DeployFragment,
  DeploymentState,
  RepoFragment,
} from '../generated/graphql'
import { useAppState, useEffects } from '../overmind'
import {
  DeploymentModel,
  DeployWorkflowCodec,
  GitHubEnvironment,
  GitHubEnvironmentsCodec,
  ReleaseModel,
  RepoModel,
} from '../overmind/state'
import graphQLApi from '../utils/graphQLApi'

export const useFetchReleases = () => {
  const { selectedApplication, appSettings } = useAppState()

  const repo = selectedApplication?.repo
  const prefix = selectedApplication?.releaseFilter ?? ''

  const { data, isLoading, error } = useQuery(
    `${repo?.owner}/${repo?.name}/releases/${prefix}`,
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
                      }): DeploymentModel => ({
                        id,
                        createdAt: dayjs(createdAt),
                        environment: environment || '',
                        state: state || DeploymentState.Inactive,
                        modifiedAt: dayjs(latestStatus?.createdAt),
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
      refetchInterval: 1000 * appSettings.refreshIntervalSecs,
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
    `${repo?.owner}/${repo?.name}/workflows`,
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

export const useFetchWorkflowRuns = () => {
  const { token, selectedApplication } = useAppState()
  const { restApi } = useEffects()

  const repo = selectedApplication?.repo
  const workflowId = DeployWorkflowCodec.is(selectedApplication?.deploySettings)
    ? selectedApplication?.deploySettings.workflowId
    : undefined
  const { data, isLoading, error } = useQuery(
    `${repo?.owner}/${repo?.name}/workflow-runs`,
    async () => {
      if (!token || !repo || !workflowId) return []

      const { owner, name } = repo

      const response = await restApi.octokit.actions.listWorkflowRuns({
        workflow_id: workflowId,
        owner,
        repo: name,
        per_page: 5,
      })

      return response.data?.workflow_runs ?? []
    }
  )
  return { data, isLoading, error }
}

export const useFetchEnvironments = () => {
  const { token, selectedApplication } = useAppState()
  const { restApi } = useEffects()

  const repo = selectedApplication?.repo

  const { data, isLoading, error } = useQuery(
    `${repo?.owner}/${repo?.name}/environments`,
    async () => {
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
      return pipe(
        GitHubEnvironmentsCodec.decode(data),
        getOrElse((e) => {
          console.error(e)
          return [] as GitHubEnvironment[]
        })
      )
    }
  )
  return { data, isLoading, error }
}

export const useFetchRepos = () => {
  const { data, isLoading, error } = useQuery('repos', async () => {
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
  return { data, isLoading, error }
}
