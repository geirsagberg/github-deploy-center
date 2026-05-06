import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Icon,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { orderBy } from 'lodash-es'
import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'
import { useFetchApplicationReleases } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import type { ApplicationConfig, PendingDeployment } from '../state/schemas'
import type { ReleaseModel } from '../store'
import { getDeploymentId, useActions, useAppState } from '../store'
import { getDeploymentState, getVisibleDeployment } from './ReleasesTableView'

type ApplicationWorkspaceProps = {
  children: ReactNode
}

type ApplicationWorkspaceViewProps = ApplicationWorkspaceProps & {
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  showNewApplicationModal: () => void
  selectApplication: (applicationId: string) => void
  editApplication: () => void
  exportApplications: () => void | Promise<unknown>
  importApplications: () => void | Promise<unknown>
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

export const ApplicationWorkspace = ({
  children,
}: ApplicationWorkspaceProps) => {
  const { applicationsById, pendingDeployments, selectedApplicationId } =
    useAppState()
  const {
    editApplication,
    exportApplications,
    importApplications,
    selectApplication,
    showNewApplicationModal,
  } = useActions()
  const applications = getSortedApplications(applicationsById)
  const releaseQueriesByApplicationId =
    useFetchApplicationReleases(applications)
  const environmentStatusesByApplicationId = Object.fromEntries(
    applications.map((application) => [
      application.id,
      getApplicationEnvironmentStatuses({
        application,
        pendingDeployments,
        releases: releaseQueriesByApplicationId[application.id]?.data ?? [],
      }),
    ]),
  )

  return (
    <ApplicationWorkspaceView
      applicationsById={applicationsById}
      environmentStatusesByApplicationId={environmentStatusesByApplicationId}
      exportApplications={exportApplications}
      importApplications={importApplications}
      selectedApplicationId={selectedApplicationId}
      showNewApplicationModal={showNewApplicationModal}
      selectApplication={selectApplication}
      editApplication={editApplication}
    >
      {children}
    </ApplicationWorkspaceView>
  )
}

export function ApplicationWorkspaceView({
  applicationsById,
  children,
  exportApplications,
  importApplications,
  selectedApplicationId,
  showNewApplicationModal,
  selectApplication,
  editApplication,
  environmentStatusesByApplicationId = {},
}: ApplicationWorkspaceViewProps) {
  const theme = useTheme()
  const applications = getSortedApplications(applicationsById)
  const selectedApplication =
    applicationsById[selectedApplicationId] ?? applications[0]

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
        <ApplicationManagementActions
          exportApplications={exportApplications}
          importApplications={importApplications}
          showNewApplicationModal={showNewApplicationModal}
        />
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
              <Link
                href={getRepoBranchUrl(selectedApplication)}
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifySelf: 'start',
                  width: 'fit-content',
                }}
                target="_blank"
                underline="always"
              >
                {formatRepo(selectedApplication)} on{' '}
                {selectedApplication.deploySettings.ref}
                <Icon
                  aria-hidden="true"
                  sx={{ fontSize: '1rem', lineHeight: 1 }}
                >
                  open_in_new
                </Icon>
              </Link>
              <SelectedApplicationCustomArgs
                extraArgs={selectedApplication.deploySettings.extraArgs}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<Icon>edit</Icon>}
              onClick={editApplication}
              disabled={!selectedApplication}
            >
              Edit
            </Button>
          </Box>
        ) : null}

        {children}
      </Box>
    </Box>
  )
}

function ApplicationManagementActions({
  exportApplications,
  importApplications,
  showNewApplicationModal,
}: {
  exportApplications: () => void | Promise<unknown>
  importApplications: () => void | Promise<unknown>
  showNewApplicationModal: () => void
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const menuOpen = !!menuAnchor

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleExport = () => {
    handleMenuClose()
    void exportApplications()
  }

  const handleImport = () => {
    handleMenuClose()
    void importApplications()
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
      <Button
        fullWidth
        variant="contained"
        color="primary"
        startIcon={<Icon>add</Icon>}
        onClick={showNewApplicationModal}
        sx={{ justifyContent: 'flex-start' }}
      >
        New Config
      </Button>
      <Tooltip title="Application actions">
        <IconButton
          aria-label="Application actions"
          aria-controls={menuOpen ? 'application-actions-menu' : undefined}
          aria-haspopup="menu"
          aria-expanded={menuOpen ? 'true' : undefined}
          onClick={handleMenuOpen}
        >
          <Icon>more_vert</Icon>
        </IconButton>
      </Tooltip>
      <Menu
        id="application-actions-menu"
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <Icon fontSize="small">download</Icon>
          </ListItemIcon>
          <ListItemText primary="Export" />
        </MenuItem>
        <MenuItem onClick={handleImport}>
          <ListItemIcon>
            <Icon fontSize="small">upload</Icon>
          </ListItemIcon>
          <ListItemText primary="Import" />
        </MenuItem>
      </Menu>
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
  const extraArgEntries = getExtraArgEntries(application)

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
        {environmentNames.length || extraArgEntries.length ? (
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
            <CustomArgsNavigationIndicator extraArgEntries={extraArgEntries} />
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

function CustomArgsNavigationIndicator({
  extraArgEntries,
}: {
  extraArgEntries: [string, string][]
}) {
  if (!extraArgEntries.length) return null

  return (
    <Tooltip title={formatExtraArgsTooltip(extraArgEntries)}>
      <Box
        aria-label={formatExtraArgsLabel(extraArgEntries.length)}
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          px: 0.55,
          py: 0.08,
          maxWidth: '100%',
          borderRadius: 0.8,
          border: (theme) =>
            `1px solid ${alpha(theme.palette.secondary.light, 0.7)}`,
          background: (theme) => alpha(theme.palette.secondary.dark, 0.38),
          color: 'secondary.light',
          fontSize: '0.64rem',
          fontWeight: 800,
          lineHeight: 1.45,
        }}
      >
        <Icon aria-hidden="true" sx={{ fontSize: '0.78rem' }}>
          tune
        </Icon>
        {extraArgEntries.length}
      </Box>
    </Tooltip>
  )
}

function SelectedApplicationCustomArgs({
  extraArgs,
}: {
  extraArgs: Record<string, string>
}) {
  const extraArgEntries = getExtraArgEntries({ deploySettings: { extraArgs } })

  if (!extraArgEntries.length) return null

  return (
    <Box
      aria-label="Custom workflow args"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.55,
        mt: 0.25,
      }}
    >
      {extraArgEntries.map(([key, value]) => (
        <Chip
          color="secondary"
          key={key}
          label={`${key}=${value}`}
          size="small"
          variant="outlined"
          sx={{
            maxWidth: '100%',
            borderColor: (theme) => alpha(theme.palette.secondary.light, 0.72),
            backgroundColor: (theme) =>
              alpha(theme.palette.secondary.dark, 0.22),
            '& .MuiChip-label': {
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      ))}
    </Box>
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
    }),
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
    const pendingDeployment =
      pendingDeployments[
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
      pendingDeployment,
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

function getRepoBranchUrl(application: ApplicationConfig) {
  const repoUrl = `https://github.com/${application.repo.owner}/${application.repo.name}`
  const ref = application.deploySettings.ref.trim()

  return ref ? `${repoUrl}/tree/${encodeURIComponent(ref)}` : repoUrl
}

function getSortedApplications(
  applicationsById: Record<string, ApplicationConfig>,
) {
  return Object.values(applicationsById).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

function getSortedReleases(
  application: ApplicationConfig,
  releases: ReleaseModel[],
) {
  return orderBy(
    releases
      .slice()
      .sort((a, b) =>
        b.tagName.localeCompare(a.tagName, undefined, { numeric: true }),
      )
      .filter((release) =>
        release.name
          .toLowerCase()
          .startsWith(application.releaseFilter.toLowerCase()),
      ),
    (release) => release.createdAt,
    'desc',
  )
}

function getEnvironmentNames(application: ApplicationConfig) {
  return Object.keys(application.environmentSettingsByName)
}

function getExtraArgEntries({
  deploySettings,
}: {
  deploySettings: { extraArgs: Record<string, string> }
}) {
  return Object.entries(deploySettings.extraArgs).sort(([left], [right]) =>
    left.localeCompare(right),
  )
}

function formatExtraArgsLabel(count: number) {
  return `${count} custom workflow ${count === 1 ? 'arg' : 'args'}`
}

function formatExtraArgsTooltip(extraArgEntries: [string, string][]) {
  const names = extraArgEntries.map(([key]) => key).join(', ')
  return `${formatExtraArgsLabel(extraArgEntries.length)}: ${names}`
}

function formatStatus(status: EnvironmentDeployStatus) {
  return status.replaceAll('-', ' ')
}
