import { Box, Button } from '@material-ui/core'
import React from 'react'
import { useActions } from '../overmind'

export const ManageApplicationsView = () => {
  const { showNewApplicationModal, importApplications, exportApplications } =
    useActions()
  return (
    <Box display="flex" style={{ gap: '1rem' }}>
      <Button
        style={{ flex: 1 }}
        variant="contained"
        color="primary"
        onClick={showNewApplicationModal}>
        New application
      </Button>
      <Button
        onClick={() => exportApplications()}>
        Export
      </Button>
      <Button
        onClick={() => importApplications()}>
        Import
      </Button>
    </Box>
  )
}
