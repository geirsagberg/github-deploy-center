import { Box, Button } from '@mui/material'
import { supported } from 'browser-fs-access'
import { useActions } from '../store'

export const ManageApplicationsView = () => {
  const { showNewApplicationModal, importApplications, exportApplications } =
    useActions()
  return (
    <Box sx={{ display: 'flex', gap: '1rem' }}>
      <Button
        style={{ flex: 1 }}
        variant="contained"
        color="primary"
        onClick={showNewApplicationModal}
      >
        New application
      </Button>
      <Button
        onClick={() => exportApplications()}
        disabled={!supported}
        title={supported ? '' : 'Not supported in your browser'}
      >
        Export
      </Button>
      <Button
        onClick={() => importApplications()}
        disabled={!supported}
        title={supported ? '' : 'Not supported in your browser'}
      >
        Import
      </Button>
    </Box>
  )
}
