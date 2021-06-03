import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@material-ui/core'
import React, { FC } from 'react'
import {
  EditApplicationDialog,
  NewApplicationDialog,
} from './components/ApplicationDialog'
import { ApplicationView } from './components/ApplicationView'
import { EnvironmentsView } from './components/EnvironmentsView'
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
            <EnvironmentsView />
          </>
        )}
      </Box>
      <NewApplicationDialog />
      <EditApplicationDialog />
    </Container>
  )
}

export default App
