import { Box, Button, Icon, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { ApplicationConfig } from '../state/schemas'
import { useActions, useAppState } from '../store'
import { useApplicationEnvironmentStatuses } from '../store/deploymentMatrixHooks'
import { ApplicationHeader } from './ApplicationHeader'
import { ApplicationNavigation } from './ApplicationNavigation'
import type { EnvironmentStatusesByApplicationId } from './applicationWorkspaceHelpers'

export type { EnvironmentDeployStatus } from './applicationWorkspaceHelpers'

type ApplicationWorkspaceProps = {
  children: ReactNode
}

type ApplicationWorkspaceViewProps = ApplicationWorkspaceProps & {
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  environmentStatusesByApplicationId?: EnvironmentStatusesByApplicationId
}

export const ApplicationWorkspace = ({
  children,
}: ApplicationWorkspaceProps) => {
  const { applicationsById, selectedApplicationId } = useAppState()
  const applications = getSortedApplications(applicationsById)
  const environmentStatusesByApplicationId =
    useApplicationEnvironmentStatuses(applications)

  return (
    <ApplicationWorkspaceView
      applicationsById={applicationsById}
      environmentStatusesByApplicationId={environmentStatusesByApplicationId}
      selectedApplicationId={selectedApplicationId}
    >
      {children}
    </ApplicationWorkspaceView>
  )
}

export function ApplicationWorkspaceView({
  applicationsById,
  children,
  selectedApplicationId,
  environmentStatusesByApplicationId = {},
}: ApplicationWorkspaceViewProps) {
  const applications = getSortedApplications(applicationsById)

  if (!applications.length) {
    return <EmptyApplicationWorkspace />
  }

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
      <ApplicationNavigation
        applications={applications}
        environmentStatusesByApplicationId={environmentStatusesByApplicationId}
        selectedApplication={selectedApplication}
      />

      <Box sx={{ minWidth: 0, display: 'grid', gap: '1rem' }}>
        <ApplicationHeader application={selectedApplication} />

        {children}
      </Box>
    </Box>
  )
}

function EmptyApplicationWorkspace() {
  const { importApplications, showNewApplicationModal } = useActions()

  return (
    <Box
      component="section"
      aria-labelledby="empty-application-heading"
      sx={{
        minHeight: { xs: 280, md: 420 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ display: 'grid', gap: 2, maxWidth: 560 }}>
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <Typography
            id="empty-application-heading"
            variant="h4"
            component="h2"
          >
            Add your first deploy config
          </Typography>
          <Typography color="text.secondary">
            Create a new config or import an existing GDC JSON file to get
            started.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Icon>add</Icon>}
            onClick={showNewApplicationModal}
          >
            New Config
          </Button>
          <Button
            variant="outlined"
            startIcon={<Icon>upload</Icon>}
            onClick={() => void importApplications()}
          >
            Import
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

function getSortedApplications(
  applicationsById: Record<string, ApplicationConfig>,
) {
  return Object.values(applicationsById).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}
