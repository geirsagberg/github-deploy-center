import {
  Button,
  CircularProgress,
  colors,
  Icon,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { orderBy, values } from 'lodash-es'
import React from 'react'
import { useMutation } from 'react-query'
import { useFetchReleases } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import { useActions, useAppState } from '../overmind'
import {
  DeploymentModel,
  DeployWorkflowCodec,
  EnvironmentSettings,
  ReleaseModel,
} from '../overmind/state'

const getButtonStyle = (state?: DeploymentState) => {
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

export const ReleasesTableView = () => {
  const { selectedApplication, pendingDeployments } = useAppState()
  const repo = selectedApplication?.repo
  const { triggerDeployment, removeEnvironment } = useActions()
  const allReleaseResultsForTag = useFetchReleases()

  const releases = allReleaseResultsForTag.data || []

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

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings) ||
    !selectedApplication.deploySettings.workflowId
  ) {
    return null
  }

  if (allReleaseResultsForTag.isLoading) {
    return <CircularProgress />
  }

  const releasesSorted = orderBy(
    releases
      .slice()
      .sort((a, b) =>
        b.tagName.localeCompare(a.tagName, undefined, { numeric: true })
      )
      .filter((r) =>
        r.name
          .toLowerCase()
          .startsWith(selectedApplication.releaseFilter.toLowerCase())
      ),
    (r) => r.createdAt,
    'desc'
  )

  const selectedEnvironments = values(
    selectedApplication.environmentSettingsById
  )

  const releasesByEnvironment = selectedEnvironments.reduce<
    Record<number, ReleaseModel[]>
  >((record, environment) => {
    record[environment.id] = releasesSorted.filter((r) =>
      r.deployments.some((d) => d.environment === environment.name)
    )
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

    const pendingDeployment =
      pendingDeployments[`${release.tagName}_${environment.id}`]
    const modifiedAt = deployment?.modifiedAt
    const deploymentState =
      pendingDeployment &&
      (!modifiedAt || pendingDeployment.isAfter(modifiedAt))
        ? DeploymentState.Pending
        : deployment?.state

    const deployButtonVariant =
      (isAfterLatest && !deploymentState) ||
      deploymentState === DeploymentState.Active
        ? 'contained'
        : 'outlined'

    return (
      <Button
        disabled={isLoading}
        variant={deployButtonVariant}
        color={!deploymentState && isAfterLatest ? 'primary' : 'default'}
        style={getButtonStyle(deploymentState)}
        onClick={() =>
          mutate({
            release: release.tagName,
            environmentId: environment.id,
          })
        }>
        {deploymentState?.replaceAll('_', ' ') ?? 'Deploy'}
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
              <TableCell key={environment.id}>
                <Link
                  href={`https://github.com/${repo?.owner}/${
                    repo?.name
                  }/deployments/activity_log?environment=${encodeURIComponent(
                    environment.name
                  )}`}
                  target="_blank"
                  color="inherit">
                  {environment.name}
                </Link>
                <IconButton onClick={() => removeEnvironment(environment.id)}>
                  <Icon>delete</Icon>
                </IconButton>
              </TableCell>
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
                const deployment = release.deployments.find(
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
