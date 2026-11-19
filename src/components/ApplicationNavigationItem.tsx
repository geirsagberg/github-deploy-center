import { Box, ButtonBase, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ApplicationConfig } from '../state/schemas'
import { useActions } from '../store'
import { ApplicationCustomArgsIndicator } from './ApplicationCustomArgs'
import {
  formatEnvironmentChipLabel,
  getEnvironmentSettings,
  getExtraArgEntries,
  type EnvironmentDeployStatus,
} from './applicationWorkspaceHelpers'
import { EnvironmentStatusChip } from './EnvironmentStatusChip'

export function ApplicationNavigationItem({
  application,
  color,
  draggedApplicationId,
  environmentStatuses,
  isSelected,
  onDraggedApplicationIdChange,
}: {
  application: ApplicationConfig
  color: string
  draggedApplicationId?: string
  environmentStatuses: Record<string, EnvironmentDeployStatus>
  isSelected: boolean
  onDraggedApplicationIdChange: (applicationId?: string) => void
}) {
  const { reorderApplication, selectApplication } = useActions()
  const environmentSettings = getEnvironmentSettings(application)
  const extraArgEntries = getExtraArgEntries(application)

  const isDropTarget =
    !!draggedApplicationId && draggedApplicationId !== application.id

  return (
    <Box
      onDragOver={(event) => {
        if (isDropTarget) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (isDropTarget) {
          reorderApplication({
            draggedId: draggedApplicationId,
            targetId: application.id,
          })
        }
        onDraggedApplicationIdChange(undefined)
      }}
      sx={{
        position: 'relative',
        borderRadius: 1.25,
        background: isSelected ? alpha(color, 0.14) : 'transparent',
        opacity: draggedApplicationId === application.id ? 0.5 : 1,
        transition: '140ms ease',
        '&:hover': {
          background: alpha(color, 0.12),
        },
      }}
    >
      <ButtonBase
        aria-label={`Switch to ${application.name}`}
        onClick={() => selectApplication(application.id)}
        sx={{
          display: 'block',
          width: '100%',
          p: 0.9,
          pl: 2.9,
          borderRadius: 'inherit',
          textAlign: 'left',
          color: 'text.primary',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: isSelected ? 800 : 600 }}>
            {application.name}
          </Typography>
          {environmentSettings.length || extraArgEntries.length ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.35,
                mt: 0.55,
              }}
            >
              {environmentSettings.map((environment) => (
                <EnvironmentStatusChip
                  environmentName={environment.name}
                  key={environment.name}
                  label={formatEnvironmentChipLabel(environment)}
                  status={environmentStatuses[environment.name] ?? 'outdated'}
                />
              ))}
              <ApplicationCustomArgsIndicator
                extraArgEntries={extraArgEntries}
              />
            </Box>
          ) : null}
        </Box>
      </ButtonBase>
      <Box
        aria-label={`Move ${application.name}`}
        draggable
        onDragStart={(event) => {
          onDraggedApplicationIdChange(application.id)
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', application.id)
        }}
        onDragEnd={() => onDraggedApplicationIdChange(undefined)}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          px: 0.9,
          cursor: 'grab',
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
      </Box>
    </Box>
  )
}
