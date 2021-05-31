import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import React, { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import { DeployWorkflowCodec } from '../overmind/state'
import { useFetchWorkflows } from './fetchHooks'

export const ApplicationView: FC = () => {
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

  const { workflowId, releaseKey, environmentKey, ref } =
    selectedApplication.deploySettings

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
