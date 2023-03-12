import {
  Alert,
  Button,
  CircularProgress,
  colors,
  Icon,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { orderBy, values } from 'lodash-es'
import { useFetchReleases, useFetchWorkflowRuns } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import { useActions, useAppState } from '../overmind'
import {
  DeploymentModel,
  DeployWorkflowCodec,
  EnvironmentSettings,
  ReleaseModel,
  WorkflowRun,
} from '../overmind/state'
import { getDeploymentId } from '../overmind/utils'

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
    case undefined:
      return {}
    default:
      return { color: colors.grey[50] }
  }
}

export const ReleasesTableView = () => {
  const { selectedApplication, pendingDeployments } = useAppState()
  const repo = selectedApplication?.repo
  const { triggerDeployment, removeEnvironment } = useActions()
  const allReleaseResultsForTag = useFetchReleases()
  const { data: workflowRuns = [] } = useFetchWorkflowRuns()

  const releases = allReleaseResultsForTag.data || []

  const {
    mutate: deploy,
    error,
    isLoading,
  } = useMutation(
    async ({
      release,
      environmentName,
    }: {
      release: string
      environmentName: string
    }) => {
      await triggerDeployment({ release, environmentName })
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
    selectedApplication.environmentSettingsByName
  )

  const releasesByEnvironment = selectedEnvironments.reduce<
    Record<string, ReleaseModel[]>
  >((record, environment) => {
    record[environment.name] = releasesSorted.filter((r) =>
      r.deployments.some((d) => d.environment === environment.name)
    )
    return record
  }, {})

  const createButton = (
    deployment: DeploymentModel | undefined,
    release: ReleaseModel,
    environment: EnvironmentSettings,
    workflowRun?: WorkflowRun
  ) => {
    const latestRelease = releasesByEnvironment[environment.name]?.[0]
    const isAfterLatest =
      !latestRelease || release.createdAt.isAfter(latestRelease.createdAt)

    const deploymentId = getDeploymentId({
      release: release.tagName,
      environment: environment.name,
      repo: selectedApplication.repo.name,
      owner: selectedApplication.repo.owner,
    })
    const pendingDeployment = pendingDeployments[deploymentId]
    const modifiedAt = deployment?.modifiedAt
    const deploymentState =
      pendingDeployment &&
      (!modifiedAt || dayjs(pendingDeployment.createdAt).isAfter(modifiedAt))
        ? DeploymentState.Pending
        : deployment?.state

    const deployButtonVariant =
      (isAfterLatest && !deploymentState) ||
      deploymentState === DeploymentState.Active
        ? 'contained'
        : 'outlined'

    deployment?.workflowRunId

    return (
      <Stack direction="row" alignItems="center" gap={1}>
        <Button
          disabled={isLoading}
          variant={deployButtonVariant}
          color={!deploymentState && isAfterLatest ? 'primary' : 'inherit'}
          style={getButtonStyle(deploymentState)}
          onClick={() =>
            deploy({
              release: release.tagName,
              environmentName: environment.name,
            })
          }>
          {deploymentState?.replaceAll('_', ' ') ?? 'Deploy'}
        </Button>
        {workflowRun && (
          <Tooltip title={`${workflowRun.name} #${workflowRun.run_number}`}>
            <IconButton
              size="medium"
              color={
                workflowRun.conclusion
                  ? workflowRun.conclusion === 'success'
                    ? 'success'
                    : 'error'
                  : 'warning'
              }
              target="_blank"
              href={workflowRun.html_url}>
              <Icon fontSize="small">launch</Icon>
            </IconButton>
          </Tooltip>
        )}
      </Stack>
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
              <TableCell key={environment.name}>
                <Stack direction="row" gap={1} alignItems="center">
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
                  <IconButton
                    onClick={() => removeEnvironment(environment.name)}>
                    <Icon>delete</Icon>
                  </IconButton>
                </Stack>
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
                // Deployments are ordered by created at in the GraphQL, so the first one is the latest
                const latestDeployment = release.deployments.find(
                  (d) => d.environment === environment.name
                )
                const workflowRun = latestDeployment?.workflowRunId
                  ? workflowRuns[latestDeployment.workflowRunId]
                  : undefined
                return (
                  <TableCell key={environment.name}>
                    {createButton(
                      latestDeployment,
                      release,
                      environment,
                      workflowRun
                    )}
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
