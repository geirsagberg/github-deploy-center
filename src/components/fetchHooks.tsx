import Axios from 'axios'
import dayjs from 'dayjs'
import { orderBy } from 'lodash-es'
import { useQuery } from 'react-query'
import { paths } from '../generated/github-types'
import { DeploymentState, RepoFragment } from '../generated/graphql'
import { useOvermindState } from '../overmind'
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
      const releases: ReleaseModel[] = fragments.map(
        ({ id, name, tagName, createdAt }) => ({
          id,
          name: name || '',
          tagName,
          createdAt: dayjs(createdAt),
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
      const deployments: DeploymentModel[] = fragments.map(
        ({ id, createdAt, environment, ref, state }) => ({
          id,
          createdAt: dayjs(createdAt),
          environment: environment || '',
          refName: ref?.name || '',
          state: state || DeploymentState.Inactive,
        })
      )
      return deployments
    }
  )

  return { data, isLoading, error }
}

export const useFetchWorkflows = () => {
  const { selectedRepo, token } = useOvermindState()
  const { data, isLoading, error } = useQuery(
    `${selectedRepo?.owner}/${selectedRepo?.name}-workflows`,
    async () => {
      if (!selectedRepo || !token) return []

      // TODO: Get all if over 100
      const response = await Axios.get<
        paths['/repos/{owner}/{repo}/actions/workflows']['get']['responses']['200']['application/json']
      >(
        `https://api.github.com/repos/${selectedRepo.owner}/${selectedRepo.name}/actions/workflows`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

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
