import { Box, Tooltip } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { EnvironmentDeployStatus } from './applicationWorkspaceHelpers'

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

export function EnvironmentStatusChip({
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

function formatStatus(status: EnvironmentDeployStatus) {
  return status.replaceAll('-', ' ')
}
