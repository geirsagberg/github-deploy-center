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
import { useState, type CSSProperties, type DragEvent } from 'react'
import { DeploymentState } from '../generated/graphql'
import type { DeploymentTarget } from '../state/deploymentMatrix'
import { useActions } from '../store'
import { useSelectedDeploymentMatrix } from '../store/deploymentMatrixHooks'
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

const getButtonStyle = (state?: DeploymentState) => {
  if (!state) return EMPTY_DEPLOYMENT_BUTTON_STYLE

  return DEPLOYMENT_BUTTON_STYLES[state] ?? DEFAULT_DEPLOYMENT_BUTTON_STYLE
}

export const ReleasesTableView = () => {
  const { triggerDeployment, reorderEnvironment, showEditEnvironmentModal } =
    useActions()
  const {
    isLoading,
    matrix,
    releaseError,
    selectedApplication,
    workflowRunsError,
  } = useSelectedDeploymentMatrix()
  const [draggedEnvironmentName, setDraggedEnvironmentName] = useState<
    string | null
  >(null)

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

  if (!selectedApplication?.deploySettings?.workflowId || !matrix) {
    return null
  }

  if (isLoading) {
    return <CircularProgress />
  }

  if (releaseError) {
    return <CredentialErrorAlert title="Could not load releases" />
  }

  if (workflowRunsError) {
    return <CredentialErrorAlert title="Could not load workflow runs" />
  }

  const repo = selectedApplication.repo

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

  const createButton = (target: DeploymentTarget) => {
    const deploymentState = target.state
    const deployButtonVariant =
      (target.isAfterLatestDeployment && !deploymentState) ||
      deploymentState === DeploymentState.Active
        ? 'contained'
        : 'outlined'

    return (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Button
          disabled={isPending}
          variant={deployButtonVariant}
          color={
            !deploymentState && target.isAfterLatestDeployment
              ? 'primary'
              : 'inherit'
          }
          sx={{ width: DEPLOYMENT_BUTTON_WIDTH }}
          style={getButtonStyle(deploymentState)}
          onClick={() =>
            deploy({
              release: target.release.tagName,
              environmentName: target.environment.name,
            })
          }
        >
          {deploymentState?.replaceAll('_', ' ') ?? 'Deploy'}
        </Button>
        {target.workflowRunLink && (
          <Tooltip title={target.workflowRunLink.title}>
            <IconButton
              aria-label={target.workflowRunLink.label}
              size="medium"
              color={
                target.workflowRunLink.conclusion
                  ? target.workflowRunLink.conclusion === 'success'
                    ? 'success'
                    : 'error'
                  : 'warning'
              }
              target="_blank"
              rel="noopener noreferrer"
              href={target.workflowRunLink.href}
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
          {matrix.environments.map((environment) => (
            <col key={environment.name} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell>Release name</TableCell>
            {matrix.environments.map((environment) => (
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
                  <Tooltip title={`Edit ${environment.name}`}>
                    <IconButton
                      aria-label={`Edit ${environment.name}`}
                      onClick={() => showEditEnvironmentModal(environment.name)}
                    >
                      <Icon>edit</Icon>
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.releases.map((release) => (
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
              {matrix.environments.map((environment) => {
                const target =
                  matrix.targetsByReleaseId[release.id][environment.name]

                return (
                  <TableCell key={environment.name}>
                    {createButton(target)}
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
