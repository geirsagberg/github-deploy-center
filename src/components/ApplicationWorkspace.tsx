import {
  Box,
  ButtonBase,
  Icon,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { orderBy } from 'lodash-es'
import type { ReactNode } from 'react'
import { useFetchApplicationReleases } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import type { ApplicationConfig } from '../state/schemas'
import type { PendingDeployment } from '../state/schemas'
import { getDeploymentId, useActions, useAppState } from '../store'
import type { ReleaseModel } from '../store'
import { getDeploymentState, getVisibleDeployment } from './ReleasesTableView'

type ApplicationWorkspaceProps = {
  children: ReactNode
}

type ApplicationWorkspaceViewProps = ApplicationWorkspaceProps & {
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  selectApplication: (applicationId: string) => void
  editApplication: () => void
  editDeployment: () => void
  environmentStatusesByApplicationId?: EnvironmentStatusesByApplicationId
}

const swatches = ['#53d89c', '#ffbf5f', '#73c9f5', '#f07768', '#c3e86d']

export type EnvironmentDeployStatus = 'up-to-date' | 'outdated' | 'failed'
type EnvironmentStatusesByApplicationId = Record<
  string,
  Record<string, EnvironmentDeployStatus>
>

const statusStyles: Record<
  EnvironmentDeployStatus,
  {
    background: string
    border: string
    color: string
  }
> = {
  'up-to-date': {
    background: '#112d20',
    border: '#53d89c',
    color: '#bdf7d8',
  },
  outdated: {
    background: '#332712',
    border: '#ffbf5f',
    color: '#ffe0ac',
  },
  failed: {
    background: '#351817',
    border: '#f07768',
    color: '#ffc5bd',
  },
}

const failedDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Abandoned,
  DeploymentState.Error,
  DeploymentState.Failure,
])

const upToDateDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Active,
  DeploymentState.Success,
])

export const ApplicationWorkspace = ({ children }: ApplicationWorkspaceProps) => {
  const {
    applicationsById,
    pendingDeployments,
    selectedApplicationId,
  } = useAppState()
  const { selectApplication, editApplication, editDeployment } = useActions()
  const applications = getSortedApplications(applicationsById)
  const releaseQueriesByApplicationId = useFetchApplicationReleases(applications)
  const environmentStatusesByApplicationId = Object.fromEntries(
    applications.map((application) => [
      application.id,
      getApplicationEnvironmentStatuses({
        application,
        pendingDeployments,
        releases: releaseQueriesByApplicationId[application.id]?.data ?? [],
      }),
    ])
  )

  return (
    <ApplicationWorkspaceView
      applicationsById={applicationsById}
      environmentStatusesByApplicationId={environmentStatusesByApplicationId}
      selectedApplicationId={selectedApplicationId}
      selectApplication={selectApplication}
      editApplication={editApplication}
      editDeployment={editDeployment}
    >
      {children}
    </ApplicationWorkspaceView>
  )
}

export function ApplicationWorkspaceView({
  applicationsById,
  children,
  selectedApplicationId,
  selectApplication,
  editApplication,
  editDeployment,
  environmentStatusesByApplicationId = {},
}: ApplicationWorkspaceViewProps) {
  const theme = useTheme()
  const applications = getSortedApplications(applicationsById)
  const selectedApplication =
    applicationsById[selectedApplicationId] ?? applications[0]

  if (!applications.length) return children

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '230px minmax(0, 1fr)' },
        gap: { xs: 2, md: 2.5 },
        alignItems: 'start',
      }}
    >
      <Box
        component="nav"
        aria-label="Applications"
        sx={{
          display: 'grid',
          alignContent: 'start',
          gap: 0.75,
          p: 1,
          borderRight: {
            md: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
          },
        }}
      >
        {applications.map((application, index) => (
          <ApplicationNavigationButton
            application={application}
            color={swatches[index % swatches.length]}
            environmentStatuses={
              environmentStatusesByApplicationId[application.id] ?? {}
            }
            isSelected={application.id === selectedApplication?.id}
            key={application.id}
            onClick={() => selectApplication(application.id)}
          />
        ))}
      </Box>

      <Box sx={{ minWidth: 0, display: 'grid', gap: '1rem' }}>
        {selectedApplication ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
              alignItems: 'start',
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '1.65rem', lineHeight: 1.1 }}>
                {selectedApplication.name}
              </Typography>
              <Typography color="text.secondary">
                {formatRepo(selectedApplication)} on{' '}
                {selectedApplication.deploySettings.ref}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {getEnvironmentNames(selectedApplication).map(
                  (environmentName) => (
                    <Box
                      key={environmentName}
                      sx={{
                        px: 1,
                        py: 0.35,
                        borderRadius: 1,
                        color: '#d9f8ff',
                        border: `1px solid ${alpha('#73c9f5', 0.35)}`,
                        background: alpha('#73c9f5', 0.1),
                        fontSize: '0.8rem',
                      }}
                    >
                      {environmentName}
                    </Box>
                  )
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Edit app settings">
                <span>
                  <IconButton
                    aria-label="Edit App"
                    color="secondary"
                    onClick={editApplication}
                    disabled={!selectedApplication}
                  >
                    <Icon>tune</Icon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Edit deploy settings">
                <span>
                  <IconButton
                    aria-label="Edit Deploy"
                    color="secondary"
                    onClick={editDeployment}
                    disabled={!selectedApplication}
                  >
                    <Icon>rocket_launch</Icon>
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        ) : null}

        {children}
      </Box>
    </Box>
  )
}

function ApplicationNavigationButton({
  application,
  color,
  environmentStatuses,
  isSelected,
  onClick,
}: {
  application: ApplicationConfig
  color: string
  environmentStatuses: Record<string, EnvironmentDeployStatus>
  isSelected: boolean
  onClick: () => void
}) {
  const environmentNames = getEnvironmentNames(application)

  return (
    <ButtonBase
      aria-label={`Switch to ${application.name}`}
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateColumns: '8px minmax(0, 1fr)',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        p: 0.9,
        borderRadius: 1.25,
        textAlign: 'left',
        color: 'text.primary',
        background: isSelected ? alpha(color, 0.14) : 'transparent',
        transition: '140ms ease',
        '&:hover': {
          background: alpha(color, 0.12),
        },
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 36,
          borderRadius: 1,
          background: color,
          opacity: isSelected ? 1 : 0.45,
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: isSelected ? 800 : 600 }}>
          {application.name}
        </Typography>
        {environmentNames.length ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.35,
              mt: 0.55,
            }}
          >
            {environmentNames.map((environmentName) => (
              <EnvironmentStatusChip
                environmentName={environmentName}
                key={environmentName}
                status={environmentStatuses[environmentName] ?? 'outdated'}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    </ButtonBase>
  )
}

function EnvironmentStatusChip({
  environmentName,
  status,
}: {
  environmentName: string
  status: EnvironmentDeployStatus
}) {
  const colors = statusStyles[status]

  return (
    <Tooltip title={`${environmentName}: ${formatStatus(status)}`}>
      <Box
        aria-label={`${environmentName} is ${status}`}
        component="span"
        sx={{
          px: 0.55,
          py: 0.08,
          maxWidth: '100%',
          borderRadius: 0.8,
          border: `1px solid ${alpha(colors.border, 0.66)}`,
          background: alpha(colors.background, 0.88),
          color: colors.color,
          fontSize: '0.64rem',
          fontWeight: 800,
          lineHeight: 1.45,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {environmentName}
      </Box>
    </Tooltip>
  )
}

export function getApplicationEnvironmentStatuses({
  application,
  pendingDeployments,
  releases,
}: {
  application: ApplicationConfig
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
}) {
  const releasesSorted = getSortedReleases(application, releases)
  const newestRelease = releasesSorted[0]

  return Object.fromEntries(
    getEnvironmentNames(application).map((environmentName) => {
      const latestDeployment = getLatestDeploymentForEnvironment({
        application,
        environmentName,
        pendingDeployments,
        releases: releasesSorted,
      })
      const deploymentState = latestDeployment?.deploymentState

      if (deploymentState && failedDeploymentStates.has(deploymentState)) {
        return [environmentName, 'failed']
      }

      if (
        newestRelease &&
        latestDeployment?.release.id === newestRelease.id &&
        deploymentState &&
        upToDateDeploymentStates.has(deploymentState)
      ) {
        return [environmentName, 'up-to-date']
      }

      return [environmentName, 'outdated']
    })
  ) as Record<string, EnvironmentDeployStatus>
}

function getLatestDeploymentForEnvironment({
  application,
  environmentName,
  pendingDeployments,
  releases,
}: {
  application: ApplicationConfig
  environmentName: string
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
}) {
  for (const release of releases) {
    const pendingDeployment = pendingDeployments[
      getDeploymentId({
        environment: environmentName,
        owner: application.repo.owner,
        release: release.tagName,
        repo: application.repo.name,
      })
    ]
    const deployment = getVisibleDeployment(
      release.deployments,
      environmentName,
      pendingDeployment
    )
    const deploymentState = getDeploymentState({
      deployment,
      pendingDeployment,
    })

    if (deploymentState) {
      return {
        deploymentState,
        release,
      }
    }
  }

  return undefined
}

function formatRepo(application: ApplicationConfig) {
  return `${application.repo.owner}/${application.repo.name}`
}

function getSortedApplications(
  applicationsById: Record<string, ApplicationConfig>
) {
  return Object.values(applicationsById).sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}

function getSortedReleases(
  application: ApplicationConfig,
  releases: ReleaseModel[]
) {
  return orderBy(
    releases
      .slice()
      .sort((a, b) =>
        b.tagName.localeCompare(a.tagName, undefined, { numeric: true })
      )
      .filter((release) =>
        release.name
          .toLowerCase()
          .startsWith(application.releaseFilter.toLowerCase())
      ),
    (release) => release.createdAt,
    'desc'
  )
}

function getEnvironmentNames(application: ApplicationConfig) {
  return Object.keys(application.environmentSettingsByName)
}

function formatStatus(status: EnvironmentDeployStatus) {
  return status.replaceAll('-', ' ')
}
