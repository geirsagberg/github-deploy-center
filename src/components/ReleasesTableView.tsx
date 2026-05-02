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
import { useState, type CSSProperties, type DragEvent } from 'react'
import { useFetchReleases, useFetchWorkflowRuns } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import type {
  EnvironmentSettings,
  PendingDeployment,
  WorkflowRun,
} from '../state/schemas'
import type { DeploymentModel, ReleaseModel } from '../store'
import { getDeploymentId, useActions, useAppState } from '../store'
import { CredentialErrorAlert } from './CredentialErrorAlert'

const RELEASE_COLUMN_WIDTH = '12rem'
const DEPLOYMENT_BUTTON_WIDTH = '8rem'

const EMPTY_DEPLOYMENT_BUTTON_STYLE = {}
const DEFAULT_DEPLOYMENT_BUTTON_STYLE = { color: colors.grey[50] }
const DEPLOYMENT_BUTTON_STYLES: Partial<Record<DeploymentState, CSSProperties>> = {
  [DeploymentState.Active]: { backgroundColor: colors.blue[400] },
  [DeploymentState.Failure]: { color: colors.red[400] },
  [DeploymentState.Pending]: { color: colors.orange[400] },
  [DeploymentState.InProgress]: { color: colors.yellow[400] },
}

const TRANSIENT_DEPLOYMENT_STATES = new Set<DeploymentState>([
  DeploymentState.Pending,
  DeploymentState.InProgress,
  DeploymentState.Queued,
  DeploymentState.Waiting,
])

const getButtonStyle = (state?: DeploymentState) => {
  if (!state) return EMPTY_DEPLOYMENT_BUTTON_STYLE

  return DEPLOYMENT_BUTTON_STYLES[state] ?? DEFAULT_DEPLOYMENT_BUTTON_STYLE
}

const isTransientDeploymentState = (state?: DeploymentState) =>
  !!state && TRANSIENT_DEPLOYMENT_STATES.has(state)

export function getVisibleDeployment(
  deployments: DeploymentModel[],
  environmentName: string,
  pendingDeployment?: PendingDeployment,
) {
  return deployments.find(
    (deployment) =>
      deployment.environment === environmentName &&
      (!!pendingDeployment || !isTransientDeploymentState(deployment.state)),
  )
}

export function getDeploymentState({
  deployment,
  pendingDeployment,
}: {
  deployment?: DeploymentModel
  pendingDeployment?: PendingDeployment
}) {
  const modifiedAt = deployment?.modifiedAt

  if (
    pendingDeployment &&
    (!modifiedAt || dayjs(pendingDeployment.createdAt).isAfter(modifiedAt))
  ) {
    return DeploymentState.Pending
  }

  if (
    !pendingDeployment &&
    isTransientDeploymentState(deployment?.state)
  ) {
    return undefined
  }

  return deployment?.state
}

function getLatestReleaseByEnvironment(
  releases: ReleaseModel[],
  environments: EnvironmentSettings[],
  getPendingDeployment: (
    release: ReleaseModel,
    environment: EnvironmentSettings,
  ) => PendingDeployment | undefined,
) {
  const remainingEnvironmentNames = new Set(
    environments.map((environment) => environment.name),
  )
  const latestReleaseByEnvironment: Record<string, ReleaseModel> = {}

  for (const release of releases) {
    if (remainingEnvironmentNames.size === 0) break

    for (const environment of environments) {
      if (!remainingEnvironmentNames.has(environment.name)) continue

      const pendingDeployment = getPendingDeployment(release, environment)
      const deployment = getVisibleDeployment(
        release.deployments,
        environment.name,
        pendingDeployment,
      )

      if (!pendingDeployment && !deployment) continue

      latestReleaseByEnvironment[environment.name] = release
      remainingEnvironmentNames.delete(environment.name)
      if (remainingEnvironmentNames.size === 0) break
    }
  }

  return latestReleaseByEnvironment
}

export const ReleasesTableView = () => {
  const { selectedApplication, pendingDeployments } = useAppState()
  const repo = selectedApplication?.repo
  const { triggerDeployment, removeEnvironment, reorderEnvironment } =
    useActions()
  const allReleaseResultsForTag = useFetchReleases()
  const workflowRunsQuery = useFetchWorkflowRuns()
  const [draggedEnvironmentName, setDraggedEnvironmentName] = useState<
    string | null
  >(null)
  const { data: workflowRuns = [] } = workflowRunsQuery

  const releases = allReleaseResultsForTag.data || []

  const {
    mutate: deploy,
    error,
    isPending,
  } = useMutation({
    mutationFn: async ({
      release,
      environmentName,
    }: {
      release: string
      environmentName: string
    }) => {
      await triggerDeployment({ release, environmentName })
    },
  })

  if (!selectedApplication?.deploySettings?.workflowId) {
    return null
  }

  if (allReleaseResultsForTag.isLoading) {
    return <CircularProgress />
  }

  if (allReleaseResultsForTag.error) {
    return <CredentialErrorAlert title="Could not load releases" />
  }

  if (workflowRunsQuery.error) {
    return <CredentialErrorAlert title="Could not load workflow runs" />
  }

  const releasesSorted = orderBy(
    releases
      .slice()
      .sort((a, b) =>
        b.tagName.localeCompare(a.tagName, undefined, { numeric: true }),
      )
      .filter((r) =>
        r.name
          .toLowerCase()
          .startsWith(selectedApplication.releaseFilter.toLowerCase()),
      ),
    (r) => r.createdAt,
    'desc',
  )

  const selectedEnvironments = values(
    selectedApplication.environmentSettingsByName,
  )

  const dropEnvironment = (
    event: DragEvent,
    targetEnvironmentName: string,
  ) => {
    event.preventDefault()

    if (
      draggedEnvironmentName &&
      draggedEnvironmentName !== targetEnvironmentName
    ) {
      reorderEnvironment({
        draggedName: draggedEnvironmentName,
        targetName: targetEnvironmentName,
      })
    }

    setDraggedEnvironmentName(null)
  }

  const getPendingDeployment = (
    release: ReleaseModel,
    environment: EnvironmentSettings,
  ) => {
    const deploymentId = getDeploymentId({
      release: release.tagName,
      environment: environment.name,
      repo: selectedApplication.repo.name,
      owner: selectedApplication.repo.owner,
    })

    return pendingDeployments[deploymentId]
  }

  const latestReleaseByEnvironment = getLatestReleaseByEnvironment(
    releasesSorted,
    selectedEnvironments,
    getPendingDeployment,
  )

  const createButton = (
    deployment: DeploymentModel | undefined,
    release: ReleaseModel,
    environment: EnvironmentSettings,
    pendingDeployment?: PendingDeployment,
    workflowRun?: WorkflowRun,
  ) => {
    const latestRelease = latestReleaseByEnvironment[environment.name]
    const isAfterLatest =
      !latestRelease || release.createdAt.isAfter(latestRelease.createdAt)

    const deploymentState = getDeploymentState({
      deployment,
      pendingDeployment,
    })

    const deployButtonVariant =
      (isAfterLatest && !deploymentState) ||
      deploymentState === DeploymentState.Active
        ? 'contained'
        : 'outlined'

    return (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Button
          disabled={isPending}
          variant={deployButtonVariant}
          color={!deploymentState && isAfterLatest ? 'primary' : 'inherit'}
          sx={{ width: DEPLOYMENT_BUTTON_WIDTH }}
          style={getButtonStyle(deploymentState)}
          onClick={() =>
            deploy({
              release: release.tagName,
              environmentName: environment.name,
            })
          }
        >
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
              href={workflowRun.html_url}
            >
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
      <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: RELEASE_COLUMN_WIDTH }} />
          {selectedEnvironments.map((environment) => (
            <col key={environment.name} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>Release name</TableCell>
            {selectedEnvironments.map((environment) => (
              <TableCell
                key={environment.name}
                onDragOver={(event) => {
                  if (
                    draggedEnvironmentName &&
                    draggedEnvironmentName !== environment.name
                  ) {
                    event.preventDefault()
                  }
                }}
                onDrop={(event) => dropEnvironment(event, environment.name)}
                sx={{
                  '& .environment-drag-handle': {
                    opacity: draggedEnvironmentName ? 1 : 0,
                    transition: 'opacity 120ms ease',
                  },
                  '&:hover .environment-drag-handle, &:focus-within .environment-drag-handle':
                    {
                      opacity: 1,
                    },
                }}
              >
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                  <IconButton
                    aria-label={`Move ${environment.name}`}
                    className="environment-drag-handle"
                    draggable
                    size="small"
                    sx={{ cursor: 'grab' }}
                    onDragStart={(event) => {
                      setDraggedEnvironmentName(environment.name)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', environment.name)
                    }}
                    onDragEnd={() => setDraggedEnvironmentName(null)}
                  >
                    <Icon fontSize="small">drag_indicator</Icon>
                  </IconButton>
                  <Link
                    href={`https://github.com/${repo?.owner}/${
                      repo?.name
                    }/deployments/activity_log?environment=${encodeURIComponent(
                      environment.name,
                    )}`}
                    target="_blank"
                    color="inherit"
                  >
                    {environment.name}
                  </Link>
                  <IconButton
                    onClick={() => removeEnvironment(environment.name)}
                  >
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
              <TableCell>
                <Link
                  href={`https://github.com/${repo?.owner}/${repo?.name}/releases/tag/${release.tagName}`}
                  target="_blank"
                  color="inherit"
                >
                  {release.name}
                </Link>
              </TableCell>
              {selectedEnvironments.map((environment) => {
                const pendingDeployment = getPendingDeployment(
                  release,
                  environment,
                )
                const latestDeployment = getVisibleDeployment(
                  release.deployments,
                  environment.name,
                  pendingDeployment,
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
                      pendingDeployment,
                      workflowRun,
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
