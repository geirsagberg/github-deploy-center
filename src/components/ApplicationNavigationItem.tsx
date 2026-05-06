import { Box, ButtonBase, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ApplicationConfig } from '../state/schemas'
import { useActions } from '../store'
import { ApplicationCustomArgsIndicator } from './ApplicationCustomArgs'
import {
  getEnvironmentNames,
  getExtraArgEntries,
  type EnvironmentDeployStatus,
} from './applicationWorkspaceHelpers'
import { EnvironmentStatusChip } from './EnvironmentStatusChip'

export function ApplicationNavigationItem({
  application,
  color,
  environmentStatuses,
  isSelected,
}: {
  application: ApplicationConfig
  color: string
  environmentStatuses: Record<string, EnvironmentDeployStatus>
  isSelected: boolean
}) {
  const { selectApplication } = useActions()
  const environmentNames = getEnvironmentNames(application)
  const extraArgEntries = getExtraArgEntries(application)

  return (
    <ButtonBase
      aria-label={`Switch to ${application.name}`}
      onClick={() => selectApplication(application.id)}
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
            <ApplicationCustomArgsIndicator
              extraArgEntries={extraArgEntries}
            />
          </Box>
        ) : null}
      </Box>
    </ButtonBase>
  )
}
