import { Box, Chip, Icon, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  formatExtraArgsLabel,
  formatExtraArgsTooltip,
  getExtraArgEntries,
  type ExtraArgEntry,
} from './applicationWorkspaceHelpers'

export function ApplicationCustomArgChips({
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

export function ApplicationCustomArgsIndicator({
  extraArgEntries,
}: {
  extraArgEntries: ExtraArgEntry[]
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
