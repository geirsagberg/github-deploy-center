import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApplicationConfig } from '../state/schemas'
import type { EnvironmentStatusesByApplicationId } from './applicationWorkspaceHelpers'
import { ApplicationNavigationActions } from './ApplicationNavigationActions'
import { ApplicationNavigationItem } from './ApplicationNavigationItem'

const swatches = ['#53d89c', '#ffbf5f', '#73c9f5', '#f07768', '#c3e86d']

export function ApplicationNavigation({
  applications,
  environmentStatusesByApplicationId,
  selectedApplication,
}: {
  applications: ApplicationConfig[]
  environmentStatusesByApplicationId: EnvironmentStatusesByApplicationId
  selectedApplication?: ApplicationConfig
}) {
  const theme = useTheme()

  return (
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
      <ApplicationNavigationActions />
      {applications.map((application, index) => (
        <ApplicationNavigationItem
          application={application}
          color={swatches[index % swatches.length]}
          environmentStatuses={
            environmentStatusesByApplicationId[application.id] ?? {}
          }
          isSelected={application.id === selectedApplication?.id}
          key={application.id}
        />
      ))}
    </Box>
  )
}
