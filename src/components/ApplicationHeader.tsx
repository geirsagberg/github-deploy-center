import { Box, Button, Icon, Link, Typography } from '@mui/material'
import type { ApplicationConfig } from '../state/schemas'
import { useActions } from '../store'
import { ApplicationCustomArgChips } from './ApplicationCustomArgs'

export function ApplicationHeader({
  application,
}: {
  application: ApplicationConfig
}) {
  const { editApplication } = useActions()

  return (
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
          {application.name}
        </Typography>
        <Link
          href={getRepoBranchUrl(application)}
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
          {formatRepo(application)} on {application.deploySettings.ref}
          <Icon aria-hidden="true" sx={{ fontSize: '1rem', lineHeight: 1 }}>
            open_in_new
          </Icon>
        </Link>
        <ApplicationCustomArgChips
          extraArgs={application.deploySettings.extraArgs}
        />
      </Box>
      <Button
        variant="outlined"
        startIcon={<Icon>edit</Icon>}
        onClick={editApplication}
      >
        Edit
      </Button>
    </Box>
  )
}

function formatRepo(application: ApplicationConfig) {
  return `${application.repo.owner}/${application.repo.name}`
}

function getRepoBranchUrl(application: ApplicationConfig) {
  const repoUrl = `https://github.com/${application.repo.owner}/${application.repo.name}`
  const ref = application.deploySettings.ref.trim()

  return ref ? `${repoUrl}/tree/${encodeURIComponent(ref)}` : repoUrl
}
