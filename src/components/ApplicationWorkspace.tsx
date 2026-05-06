import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import type { ApplicationConfig } from '../state/schemas'
import { useAppState } from '../store'
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
        {selectedApplication ? (
          <ApplicationHeader application={selectedApplication} />
        ) : null}

        {children}
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
