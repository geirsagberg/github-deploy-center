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
  environmentStatuses,
  isDragged,
  isSelected,
  nextApplicationId,
  onDragEnd,
  onDragOver,
  onDragStart,
  previousApplicationId,
}: {
  application: ApplicationConfig
  color: string
  environmentStatuses: Record<string, EnvironmentDeployStatus>
  isDragged: boolean
  isSelected: boolean
  nextApplicationId?: string
  onDragEnd: () => void
  onDragOver: (isPointerInLowerHalf: boolean) => void
  onDragStart: () => void
  previousApplicationId?: string
}) {
  const { reorderApplication, selectApplication } = useActions()
  const environmentSettings = getEnvironmentSettings(application)
  const extraArgEntries = getExtraArgEntries(application)

  return (
    <Box
      onDragOver={(event) => {
        const { top, height } = event.currentTarget.getBoundingClientRect()
        onDragOver(event.clientY > top + height / 2)
      }}
      sx={{
        position: 'relative',
        borderRadius: 1.25,
        background: isSelected ? alpha(color, 0.14) : 'transparent',
        opacity: isDragged ? 0.5 : 1,
        transition: '140ms ease',
        '&:hover': {
          background: alpha(color, 0.12),
        },
        '&:hover .application-drag-handle': {
          height: 30,
          opacity: 1,
          '&::after': { opacity: 1 },
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
        aria-keyshortcuts="ArrowUp ArrowDown"
        draggable
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          const targetId =
            event.key === 'ArrowUp'
              ? previousApplicationId
              : event.key === 'ArrowDown'
                ? nextApplicationId
                : undefined
          if (!targetId) return
          event.preventDefault()
          reorderApplication({ draggedId: application.id, targetId })
        }}
        onDragStart={(event) => {
          onDragStart()
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', application.id)
        }}
        onDragEnd={onDragEnd}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          px: 0.9,
          borderRadius: 'inherit',
          cursor: 'grab',
          '&:focus-visible': {
            outline: `2px solid ${color}`,
            outlineOffset: -2,
          },
        }}
      >
        <Box
          className="application-drag-handle"
          sx={{
            position: 'relative',
            width: 8,
            height: 36,
            borderRadius: 1,
            background: color,
            opacity: isSelected ? 1 : 0.45,
            transition: '140ms ease',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              height: 12,
              margin: 'auto 0',
              backgroundImage: `radial-gradient(circle, ${alpha('#000', 0.4)} 1px, transparent 1.5px)`,
              backgroundSize: '4px 4px',
              opacity: 0,
              transition: 'opacity 140ms ease',
            },
          }}
        />
      </Box>
    </Box>
  )
}
