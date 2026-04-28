import { Box, Button } from '@mui/material'
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
      <Button onClick={() => exportApplications()}>
        Export
      </Button>
      <Button onClick={() => importApplications()}>
        Import
      </Button>
    </Box>
  )
}
