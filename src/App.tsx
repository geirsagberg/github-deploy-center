import { Box, Container, Paper, TextField, Typography } from '@material-ui/core'
import React, { FC } from 'react'
import { RepoSearchView } from './components/RepoSearchView'
import { RepoView } from './components/RepoView'
import { useActions, useOvermindState } from './overmind'

const App: FC = () => {
  const { token, selectedRepo } = useOvermindState()
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
        {token && <RepoSearchView />}
        {selectedRepo && <RepoView />}
      </Box>
    </Container>
  )
}

export default App
