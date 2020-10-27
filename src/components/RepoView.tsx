import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { map, size } from 'lodash-es'
import React, { FC, Fragment } from 'react'
import { useActions, useOvermindState } from '../overmind'
import {
  useFetchDeployments,
  useFetchReleases,
  useFetchWorkflows,
} from './fetchHooks'
import { ReleasesTableView } from './ReleasesTableView'

export const ActionDeploySettingsView: FC = () => {
  const {
    deploySettingsForSelectedRepo: { action },
  } = useOvermindState()
  const {
    addWorkflowInput,
    deleteWorkflowInput,
    setWorkflowForSelectedRepo,
    updateInput,
  } = useActions()
  const { data, error, isLoading } = useFetchWorkflows()

  if (action == null) return null

  if (error instanceof Error) {
    return <Alert severity="warning">{error.message}</Alert>
  }

  return (
    <>
      <FormControl variant="outlined">
        <InputLabel id="workflow-select-label">Workflow</InputLabel>
        {isLoading ? (
          <CircularProgress />
        ) : data ? (
          <Select
            labelId="workflow-select-label"
            id="workflow-select"
            value={action.workflowId}
            label="Workflow"
            onChange={(e) =>
              setWorkflowForSelectedRepo((e.target.value as string) || '')
            }>
            <MenuItem value="">
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
      <Typography variant="body2">Inputs</Typography>

      {size(action.inputs) === 0 ? (
        <Typography color="textSecondary">No inputs yet...</Typography>
      ) : (
        <Box display="grid" gridTemplateColumns="3fr 3fr 1fr" gridGap="1rem">
          {map(action.inputs, ([key, value], index) => (
            <Fragment key={index}>
              <TextField
                size="small"
                value={key}
                variant="outlined"
                label="key"
                onChange={(e) =>
                  updateInput({ index, key: e.target.value, value })
                }
              />
              <TextField
                size="small"
                value={value}
                variant="outlined"
                label="value"
                onChange={(e) =>
                  updateInput({ index, key, value: e.target.value })
                }
              />
              <Button onClick={() => deleteWorkflowInput(index)}>Delete</Button>
            </Fragment>
          ))}
        </Box>
      )}
      <Button
        style={{ justifySelf: 'start' }}
        variant="outlined"
        onClick={() => addWorkflowInput()}>
        Add input
      </Button>
    </>
  )
}

export const RepoView: FC = () => {
  const { selectedRepo, deploySettingsForSelectedRepo } = useOvermindState()

  const releaseResults = useFetchReleases()
  const deploymentResults = useFetchDeployments()

  if (!selectedRepo) return null
  return (
    <>
      <Typography variant="h3">{selectedRepo.name}</Typography>
      <Typography variant="h4">How to deploy</Typography>
      <FormControl component="fieldset">
        <FormLabel component="legend">Deploy type</FormLabel>
        <RadioGroup
          aria-label="Deploy type"
          name="deploy-type"
          value={deploySettingsForSelectedRepo.type}>
          <FormControlLabel
            value="action"
            control={<Radio />}
            label="Trigger `workflow_dispatch` GitHub Action"
          />
          <FormControlLabel
            value="webhook"
            control={<Radio />}
            label="Call webhook (coming soon)"
            disabled
          />
          <FormControlLabel
            value="deployment"
            control={<Radio />}
            label="Create GitHub Deployment (coming soon)"
            disabled
          />
        </RadioGroup>
      </FormControl>
      {deploySettingsForSelectedRepo.type === 'action' && (
        <ActionDeploySettingsView />
      )}
      <Typography variant="h4">Deployments</Typography>
      {releaseResults.error instanceof Error && (
        <Alert severity="error">{releaseResults.error.message}</Alert>
      )}
      {deploymentResults.error instanceof Error && (
        <Alert severity="error">{deploymentResults.error.message}</Alert>
      )}
      <ReleasesTableView />
      {releaseResults.isLoading || deploymentResults.isLoading ? (
        <CircularProgress />
      ) : null}
    </>
  )
}
