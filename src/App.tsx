import { Box, Container, Paper, TextField, Typography } from '@material-ui/core'
import React from 'react'
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from './components/ApplicationDialog'
import { DeploymentDialog } from './components/DeploymentDialog'
import { EnvironmentsView } from './components/EnvironmentsView'
import { ManageApplicationsView } from './components/ManageApplicationsView'
import { ReleasesTableView } from './components/ReleasesTableView'
import { SelectApplicationView } from './components/SelectApplicationView'
import { useActions, useAppState } from './overmind'

const App = () => {
  const { token } = useAppState()
  const { setToken } = useActions()
  return (
    <Container>
      <Box p={4} display="grid" gridGap="1rem" component={Paper}>
        <Typography variant="h1">GitHub Deploy Center</Typography>
        <TextField
          label="Personal Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
        />
        {token && (
          <>
            <ManageApplicationsView />
            <SelectApplicationView />
            <EnvironmentsView />
            <ReleasesTableView />
            <NewApplicationDialog />
            <EditApplicationDialog />
            <DeploymentDialog />
          </>
        )}
      </Box>
    </Container>
  )
}

export default App
