import {
  Box,
  Container,
  Icon,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@material-ui/core'
import React from 'react'
import ModalContainer from 'react-modal-promise'
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from './components/ApplicationDialog'
import { DeploymentDialog } from './components/DeploymentDialog'
import { EnvironmentsView } from './components/EnvironmentsView'
import { ManageApplicationsView } from './components/ManageApplicationsView'
import { ReleasesTableView } from './components/ReleasesTableView'
import { SelectApplicationView } from './components/SelectApplicationView'
import { SettingsDialog } from './components/SettingsDialog'
import { useActions, useAppState } from './overmind'

const App = () => {
  const { token } = useAppState()
  const { setToken, showSettings } = useActions()
  return (
    <Container>
      <Box p={4} display="grid" gridGap="1rem" component={Paper}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h1">GitHub Deploy Center</Typography>
          <IconButton title="Settings" onClick={() => showSettings()}>
            <Icon>settings</Icon>
          </IconButton>
        </Box>
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
      <SettingsDialog />
      <ModalContainer />
    </Container>
  )
}

export default App
