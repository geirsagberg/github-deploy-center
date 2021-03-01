import dayjs from 'dayjs'
import { orderBy } from 'lodash-es'
import { useQuery } from 'react-query'
import { DeploymentState, RepoFragment } from '../generated/graphql'
import { useEffects, useOvermindState } from '../overmind'
import { DeploymentModel, ReleaseModel, RepoModel } from '../overmind/state'
import graphQLApi from '../utils/graphQLApi'

export const useFetchReleases = () => {
  const { selectedRepo } = useOvermindState()

  const { data, isLoading, error } = useQuery(
    `${selectedRepo?.owner}/${selectedRepo?.name}-releases`,
    async () => {
      if (!selectedRepo) return []

      const result = await graphQLApi.fetchReleases({
        repoName: selectedRepo.name,
        repoOwner: selectedRepo.owner,
      })
      const fragments = result.repository?.releases.nodes?.map((n) => n!) ?? []
      const releases = fragments.map(
        ({ id, name, tagName, createdAt, tag }): ReleaseModel => ({
          id,
          name: name || '',
          tagName,
          createdAt: dayjs(createdAt),
          commit: tag?.target?.oid || '',
        })
      )
      return releases
    }
  )

  return { data, isLoading, error }
}

export const useFetchDeployments = () => {
  const { selectedRepo } = useOvermindState()
  const { data, isLoading, error } = useQuery(
    `${selectedRepo?.owner}/${selectedRepo?.name}-deployments`,
    async () => {
      if (!selectedRepo) return []

      const result = await graphQLApi.fetchDeployments({
        repoName: selectedRepo.name,
        repoOwner: selectedRepo.owner,
      })
      const fragments =
        result.repository?.deployments.nodes?.map((n) => n!) ?? []
      const deployments = fragments.map(
        ({
          id,
          createdAt,
          environment,
          commit,
          ref,
          state,
        }): DeploymentModel => ({
          id,
          createdAt: dayjs(createdAt),
          environment: environment || '',
          refName: ref?.name || '',
          commit: commit?.oid || '',
          state: state || DeploymentState.Inactive,
        })
      )
      return deployments
    }
  )

  return { data, isLoading, error }
}

export const useFetchWorkflows = (repo: RepoModel | undefined) => {
  const { token } = useOvermindState()
  const { restApi } = useEffects()
  const { data, isLoading, error } = useQuery(
    `${repo?.owner}/${repo?.name}-workflows`,
    async () => {
      if (!token || !repo) return []

      const { owner, name } = repo

      const response = await restApi.octokit.actions.listRepoWorkflows({
        owner,
        repo: name,
        per_page: 100,
      })

      // TODO: Only return workflows with `workflow_dispatch` trigger
      return orderBy(response.data?.workflows ?? [], (w) => w.name)
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
