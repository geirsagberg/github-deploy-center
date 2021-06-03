import {
  Button,
  colors,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { groupBy, keyBy, orderBy, values } from 'lodash-es'
import { FC } from 'react'
import { useMutation } from 'react-query'
import { DeploymentState } from '../generated/graphql'
import { useActions, useOvermindState } from '../overmind'
import {
  DeploymentModel,
  EnvironmentSettings,
  ReleaseModel,
} from '../overmind/state'
import { useFetchDeployments, useFetchReleases } from './fetchHooks'

const getButtonStyle = (state: DeploymentState) => {
  switch (state) {
    case DeploymentState.Active:
      return { backgroundColor: colors.blue[400] }
    case DeploymentState.Failure:
      return { color: colors.red[400] }
    case DeploymentState.Pending:
      return { color: colors.orange[400] }
    case DeploymentState.InProgress:
      return { color: colors.yellow[400] }
    default:
      return { color: colors.grey[50] }
  }
}

const getButtonVariant = (state: DeploymentState): 'contained' | 'outlined' => {
  return state === DeploymentState.Active ? 'contained' : 'outlined'
}

export const ReleasesTableView: FC = () => {
  const { selectedApplication } = useOvermindState()
  const repo = selectedApplication?.repo
  const { triggerDeployment } = useActions()
  const allReleaseResultsForRepo = useFetchReleases()
  const allDeploymentResultsForRepo = useFetchDeployments()

  const releases = allReleaseResultsForRepo.data || []
  const deployments = allDeploymentResultsForRepo.data || []

  const { mutate, error, isLoading } = useMutation(
    async ({
      release,
      environmentId,
    }: {
      release: string
      environmentId: number
    }) => {
      await triggerDeployment({ release, environmentId })
    }
  )

  if (!selectedApplication) return null

  const releasesSorted = orderBy(
    releases.filter((r) =>
      r.name.startsWith(selectedApplication.releaseFilter)
    ),
    (r) => r.createdAt,
    'desc'
  )

  const releasesByTag = keyBy(releasesSorted, (r) => r.tagName)

  const deploymentsByTag = groupBy(deployments, (d) => d.refName)

  const selectedEnvironments = values(
    selectedApplication.environmentSettingsById
  )

  const releasesByEnvironment = selectedEnvironments.reduce<
    Record<number, ReleaseModel[]>
  >((record, environment) => {
    record[environment.id] = deployments
      .filter((d) => d.environment === environment.name)
      .map((d) => releasesByTag[d.refName])
      .filter((d) => !!d)
    return record
  }, {})

  const createButton = (
    deployment: DeploymentModel | undefined,
    release: ReleaseModel,
    environment: EnvironmentSettings
  ) => {
    const latestRelease = releasesByEnvironment[environment.id]?.[0]
    const isAfterLatest =
      !latestRelease || release.createdAt.isAfter(latestRelease.createdAt)
    const deployButtonVariant = isAfterLatest ? 'contained' : 'outlined'

    return (
      <Button
        disabled={isLoading}
        variant={
          deployment ? getButtonVariant(deployment.state) : deployButtonVariant
        }
        color={!deployment && isAfterLatest ? 'primary' : 'default'}
        style={deployment ? getButtonStyle(deployment.state) : {}}
        onClick={() =>
          mutate({
            release: release.tagName,
            environmentId: environment.id,
          })
        }>
        {deployment?.state ?? 'Deploy'}
      </Button>
    )
  }

  return (
    <>
      {error instanceof Error && (
        <Alert severity="error">{error.message}</Alert>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Release name</TableCell>
            {selectedEnvironments.map((environment) => (
              <TableCell key={environment.id}>{environment.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {releasesSorted.map((release) => (
            <TableRow key={release.id}>
              <TableCell style={{ width: '20%' }}>
                <Link
                  href={`https://github.com/${repo?.owner}/${repo?.name}/releases/tag/${release.tagName}`}
                  target="_blank"
                  color="inherit">
                  {release.name}
                </Link>
              </TableCell>
              {selectedEnvironments.map((environment) => {
                const deployment = deploymentsByTag[release.tagName]?.find(
                  (d) => d.environment === environment.name
                )
                return (
                  <TableCell key={environment.id}>
                    {createButton(deployment, release, environment)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
