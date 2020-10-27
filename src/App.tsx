import {
  Box,
  Button,
  CircularProgress,
  colors,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert, Autocomplete } from '@material-ui/lab'
import dayjs from 'dayjs'
import { groupBy, orderBy, uniq } from 'lodash-es'
import React, { FC } from 'react'
import { useQuery } from 'react-query'
import { DeploymentState, RepoFragment } from './generated/graphql'
import { useActions, useOvermindState } from './overmind'
import { DeploymentModel, ReleaseModel } from './overmind/state'
import graphQLApi from './utils/graphQLApi'

const App: FC = () => {
  const { token, selectedRepo } = useOvermindState()
  const { setToken } = useActions()
  return (
    <Container>
      <Box p={4} display="grid" gridGap="1rem" component={Paper}>
        <Typography variant="h1">GitHub Deploy Center</Typography>
        <TextField
          label="Personal Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
        />
        {token && <RepoSearchView />}
        {selectedRepo && <RepoView />}
      </Box>
    </Container>
  )
}

const useFetchReleases = () => {
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

const useFetchDeployments = () => {
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

const getButtonColor = (state: DeploymentState): string => {
  switch (state) {
    case DeploymentState.Active:
      return colors.blue[400]
    default:
      return colors.grey[50]
  }
}

const estimateEnvironmentsOrder = (
  deployments: DeploymentModel[] | null | undefined
) => {
  return uniq(
    orderBy(deployments || [], (d) => d.createdAt).map((d) => d.environment)
  )
}

const RepoView: FC = () => {
  const { selectedRepo, environmentOrderForSelectedRepo } = useOvermindState()

  const releaseResults = useFetchReleases()
  const deploymentResults = useFetchDeployments()

  const releasesSorted = orderBy(
    releaseResults.data,
    (r) => r.createdAt,
    'desc'
  )

  const deploymentsByTag = groupBy(deploymentResults.data, (d) => d.refName)

  const environmentsOrder = environmentOrderForSelectedRepo || []

  const environments = uniq(
    environmentsOrder.concat(estimateEnvironmentsOrder(deploymentResults.data))
  )

  if (!selectedRepo) return null
  return (
    <>
      <Typography variant="h3">{selectedRepo.name}</Typography>
      <Typography variant="h4">Deployments</Typography>
      {releaseResults.error instanceof Error && (
        <Alert severity="error">{releaseResults.error.message}</Alert>
      )}
      {deploymentResults.error instanceof Error && (
        <Alert severity="error">{deploymentResults.error.message}</Alert>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Release name</TableCell>
            {environments.map((environment) => (
              <TableCell key={environment}>{environment}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {releasesSorted.map((release) => (
            <TableRow key={release.id}>
              <TableCell style={{ width: '20%' }}>{release.name}</TableCell>
              {environments.map((environment) => {
                const deployment = deploymentsByTag[release.tagName]?.find(
                  (d) => d.environment === environment
                )
                return (
                  <TableCell key={environment}>
                    {deployment ? (
                      <Button
                        variant="outlined"
                        style={{ color: getButtonColor(deployment.state) }}>
                        {deployment.state}
                      </Button>
                    ) : (
                      <Button variant="contained" color="primary">
                        Deploy
                      </Button>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {releaseResults.isLoading || deploymentResults.isLoading ? (
        <CircularProgress />
      ) : null}
    </>
  )
}

const RepoSearchView: FC = () => {
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
    return repos.map((r) => ({ id: r.id, name: r.name, owner: r.owner.login }))
  })

  const { selectedRepo } = useOvermindState()
  const { setSelectedRepo } = useActions()

  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())

  return (
    <>
      <Typography variant="h2">Repositories</Typography>
      {error instanceof Error ? (
        <Typography>Error: {error.message}</Typography>
      ) : (
        <Autocomplete
          loading={isLoading}
          options={options}
          id="search-repos"
          renderInput={(params) => (
            <TextField
              variant="outlined"
              label="Search"
              {...params}
              InputProps={{
                ...params.InputProps,
                startAdornment:
                  isLoading && !selectedRepo ? (
                    <Box
                      maxWidth={24}
                      maxHeight={24}
                      ml={1}
                      component={CircularProgress}></Box>
                  ) : null,
              }}
            />
          )}
          groupBy={(r) => r.owner}
          getOptionLabel={(r) => r.name}
          getOptionSelected={(first, second) => first.id === second.id}
          value={selectedRepo}
          autoHighlight
          onChange={(_, value) => setSelectedRepo(value)}
        />
      )}
    </>
  )
}

export default App
