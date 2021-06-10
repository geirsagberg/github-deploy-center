import { Box, Button } from '@material-ui/core'
import { supported } from 'browser-fs-access'
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
        onClick={() => exportApplications()}
        disabled={!supported}
        title={supported ? '' : 'Not supported in your browser'}>
        Export
      </Button>
      <Button
        onClick={() => importApplications()}
        disabled={!supported}
        title={supported ? '' : 'Not supported in your browser'}>
        Import
      </Button>
    </Box>
  )
}
