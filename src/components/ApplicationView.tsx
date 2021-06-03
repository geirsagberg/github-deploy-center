import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Input,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { keyBy } from 'lodash-es'
import React, { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import { DeployWorkflowCodec } from '../overmind/state'
import { useFetchEnvironments, useFetchWorkflows } from './fetchHooks'

const useStyles = makeStyles({
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 2,
  },
})

export const ApplicationView: FC = () => {
  const { selectedApplication } = useOvermindState()
  const { updateWorkflowSettings } = useActions()

  const workflows = useFetchWorkflows(selectedApplication?.repo)
  const environments = useFetchEnvironments(selectedApplication?.repo)
  const classes = useStyles()

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings)
  ) {
    return null
  }

  if (workflows.error instanceof Error) {
    return <Alert severity="error">{workflows.error.message}</Alert>
  }

  if (environments.error instanceof Error) {
    return <Alert severity="error">{environments.error.message}</Alert>
  }

  const { workflowId, releaseKey, environmentKey, ref } =
    selectedApplication.deploySettings

  const { environmentIds } = selectedApplication
  const environmentsById = keyBy(environments.data, (e) => e.id)

  return (
    <>
      <Typography variant="h4">Deploy workflow settings</Typography>
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gridGap="1rem">
        <FormControl variant="outlined">
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
        <FormControl variant="outlined">
          <InputLabel id="environments-select-label">Environments</InputLabel>
          {environments.isLoading ? (
            <CircularProgress />
          ) : environments.data ? (
            <Select
              labelId="environments-select-label"
              id="environments-select"
              multiple
              value={environmentIds}
              label="Environments"
              input={<Input id="select-multiple-chip" />}
              renderValue={(selected) => (
                <div className={classes.chips}>
                  {(selected as string[])
                    .filter((id) => id in environmentsById)
                    .map((value) => (
                      <Chip
                        key={value}
                        label={environmentsById[value].name}
                        className={classes.chip}
                      />
                    ))}
                </div>
              )}>
              {environments.data.map((env) => (
                <MenuItem key={env.id} value={env.id}>
                  {env.name}
                </MenuItem>
              ))}
            </Select>
          ) : null}
        </FormControl>
      </Box>
    </>
  )
}