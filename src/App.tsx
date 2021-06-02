import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@material-ui/core'
import React, { FC } from 'react'
import { ApplicationView } from './components/ApplicationView'
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from './components/NewApplicationDialog'
import { ReleasesTableView } from './components/ReleasesTableView'
import { SelectApplicationView } from './components/SelectApplicationView'
import { useActions, useOvermindState } from './overmind'

const App: FC = () => {
  const { token } = useOvermindState()
  const { setToken, showNewApplicationModal } = useActions()
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
            <Button
              variant="contained"
              color="primary"
              onClick={showNewApplicationModal}>
              New application
            </Button>
            <SelectApplicationView />
            <ApplicationView />
            <ReleasesTableView />
          </>
        )}
      </Box>
      <NewApplicationDialog />
      <EditApplicationDialog />
    </Container>
  )
}

export default App
