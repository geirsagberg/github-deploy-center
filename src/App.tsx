import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { map, orderBy, size } from 'lodash-es'
import React, { FC, useState } from 'react'
import { useFetchRepos, useFetchWorkflows } from './components/fetchHooks'
import { RepoSearchBox } from './components/RepoSearchView'
import { useActions, useOvermindState } from './overmind'
import { DeployWorkflowCodec, RepoModel } from './overmind/state'

const NewApplicationDialog: FC = () => {
  const {
    applicationDialog: { open },
  } = useOvermindState()
  const { createNewApplication, cancelNewApplication } = useActions()
  const { data, error, isLoading } = useFetchRepos()
  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())
  const [selectedRepo, setSelectedRepo] = useState<RepoModel | null>(null)
  return (
    <Dialog open={open} fullWidth>
      <DialogTitle>New application</DialogTitle>
      <DialogContent>
        {error instanceof Error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : (
          <>
            <DialogContentText>Select repository</DialogContentText>
            <RepoSearchBox
              isLoading={isLoading}
              options={options}
              selectedRepo={selectedRepo}
              setSelectedRepo={setSelectedRepo}></RepoSearchBox>
          </>
        )}
      </DialogContent>
      <Box p={2} pt={1}>
        <DialogActions>
          <Button
            disabled={!selectedRepo}
            variant="contained"
            color="primary"
            onClick={() => selectedRepo && createNewApplication(selectedRepo)}>
            Create
          </Button>
          <Button onClick={cancelNewApplication}>Cancel</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

const ApplicationView: FC = () => {
  const { selectedApplication } = useOvermindState()
  const { updateWorkflowSettings } = useActions()
  const { data, error, isLoading } = useFetchWorkflows(
    selectedApplication?.repo
  )

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings)
  ) {
    return null
  }

  if (error instanceof Error) {
    return <Alert severity="error">{error.message}</Alert>
  }

  const {
    workflowId,
    releaseKey,
    environmentKey,
    ref,
  } = selectedApplication.deploySettings

  return (
    <>
      <Typography variant="h4">Deploy workflow settings</Typography>
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gridGap="1rem">
        <FormControl variant="outlined">
          <InputLabel id="workflow-select-label">Workflow</InputLabel>
          {isLoading ? (
            <CircularProgress />
          ) : data ? (
            <Select
              labelId="workflow-select-label"
              id="workflow-select"
              value={workflowId}
              label="Workflow"
              onChange={(e) => {
                const workflowId =
                  typeof e.target.value === 'number'
                    ? (e.target.value as number)
                    : 0
                updateWorkflowSettings(
                  (settings) => (settings.workflowId = workflowId)
                )
              }}>
              <MenuItem value={0}>
                <em>None</em>
              </MenuItem>
              {data.map((workflow) => (
                <MenuItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </MenuItem>
              ))}
            </Select>
          ) : null}
        </FormControl>
        <TextField
          label="Release input name"
          value={releaseKey}
          onChange={(e) =>
            updateWorkflowSettings(
              (settings) => (settings.releaseKey = e.target.value)
            )
          }
        />
        <TextField
          label="Environment input name"
          value={environmentKey}
          onChange={(e) =>
            updateWorkflowSettings(
              (settings) => (settings.environmentKey = e.target.value)
            )
          }
        />
        <TextField
          label="Run workflow from branch"
          value={ref}
          onChange={(e) =>
            updateWorkflowSettings(
              (settings) => (settings.ref = e.target.value)
            )
          }
        />
      </Box>
    </>
  )
}

const SelectApplicationView: FC = () => {
  const { applicationsById, selectedApplicationId } = useOvermindState()
  const { selectApplication } = useActions()
  return size(applicationsById) ? (
    <>
      <FormControl variant="outlined">
        <InputLabel id="application-select-label">Application</InputLabel>
        <Select
          labelId="application-select-label"
          label="Application"
          onChange={(event) => {
            selectApplication(event.target.value as string)
          }}
          value={selectedApplicationId}>
          {map(applicationsById, (app) => (
            <MenuItem value={app.id} key={app.id}>
              {app.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  ) : null
}

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
          </>
        )}
      </Box>
      <NewApplicationDialog />
    </Container>
  )
}

export default App
