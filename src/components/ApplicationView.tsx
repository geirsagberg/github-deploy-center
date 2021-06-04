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
import { Alert, Autocomplete } from '@material-ui/lab'
import { fromPairs } from 'lodash-es'
import React, { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import { DeployWorkflowCodec } from '../overmind/state'
import { useFetchWorkflows } from './fetchHooks'

export const ApplicationView: FC = () => {
  const { selectedApplication } = useOvermindState()
  const { updateWorkflowSettings } = useActions()

  const workflows = useFetchWorkflows()

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings)
  ) {
    return null
  }

  if (workflows.error instanceof Error) {
    return <Alert severity="error">{workflows.error.message}</Alert>
  }

  const { workflowId, releaseKey, environmentKey, ref, extraArgs } =
    selectedApplication.deploySettings

  return (
    <>
      <Typography variant="h4">Deploy workflow settings</Typography>
      <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gridGap="1rem">
        <FormControl variant="outlined" style={{ gridColumn: '1 / span 2' }}>
          <InputLabel id="workflow-select-label">Workflow</InputLabel>
          {workflows.isLoading ? (
            <CircularProgress />
          ) : workflows.data ? (
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
              {workflows.data.map((workflow) => (
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
        <Autocomplete
          style={{ gridColumn: '1 / span 5' }}
          multiple
          options={[]}
          freeSolo
          value={Object.entries(extraArgs).map(
            ([key, value]) => `${key}=${value}`
          )}
          renderInput={(params) => (
            <TextField
              label="Extra workflow args"
              placeholder="key=value"
              {...params}
            />
          )}
          onChange={(_, newValue) => {
            const pairs = newValue
              .filter((x): x is string => typeof x === 'string')
              .map((x) => x.split('='))
              .filter(([key, value]) => key && value)
            const newArgs = fromPairs(pairs)
            updateWorkflowSettings((settings) => (settings.extraArgs = newArgs))
          }}
        />
      </Box>
    </>
  )
}
