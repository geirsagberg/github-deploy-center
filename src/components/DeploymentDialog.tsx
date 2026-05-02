import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { fromPairs } from 'lodash-es'
import { useFetchEnvironments, type DispatchWorkflow } from '../api/fetchHooks'
import { useActions, useAppState } from '../store'
import type { DeploymentDialogState } from '../store'
import { SelectWorkflow } from './SelectWorkflow'

const DEFAULT_RELEASE_KEY = 'ref'
const DEFAULT_ENVIRONMENT_KEY = 'environment'

export const DeploymentDialog = () => {
  const { deploymentDialog } = useAppState()
  const { updateDeployWorkflowDialog, cancelEditDeployment, saveDeployment } =
    useActions()
  const environments = useFetchEnvironments()

  const valid = Boolean(
    deploymentDialog &&
      deploymentDialog.workflowId &&
      deploymentDialog.releaseKey &&
      deploymentDialog.ref
  )
  return (
    <Dialog open={!!deploymentDialog} fullWidth onClose={cancelEditDeployment}>
      {deploymentDialog ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) {
              saveDeployment(environments.data ?? [])
            }
          }}
        >
          <DialogTitle
            component="div"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography component="h2" variant="h6">
              Deploy workflow settings
            </Typography>
            <Tooltip
              arrow
              describeChild
              placement="left"
              title="Show all workflows and enter input names manually."
            >
              <FormControlLabel
                sx={{
                  m: 0,
                  color: 'text.secondary',
                  '& .MuiFormControlLabel-label': { fontSize: '0.875rem' },
                }}
                control={
                  <Checkbox
                    size="small"
                    checked={deploymentDialog.manualWorkflowHandling}
                    onChange={(event) =>
                      updateDeployWorkflowDialog((state) =>
                        updateManualWorkflowHandling(
                          state,
                          event.target.checked
                        )
                      )
                    }
                    sx={{ p: 0.5 }}
                  />
                }
                label="Manual"
              />
            </Tooltip>
          </DialogTitle>
          <DialogContent
            style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: 'column',
              overflow: 'visible',
            }}
          >
            <SelectWorkflow
              workflowId={deploymentDialog.workflowId}
              manualWorkflowHandling={deploymentDialog.manualWorkflowHandling}
              onChange={(workflow) =>
                updateDeployWorkflowDialog((state) =>
                  selectWorkflow(state, workflow)
                )
              }
            />
            <TextField
              label="Release input name"
              value={deploymentDialog.releaseKey}
              onChange={(e) =>
                updateDeployWorkflowDialog(
                  (settings) => (settings.releaseKey = e.target.value)
                )
              }
            />
            <TextField
              label="Environment input name (optional)"
              value={deploymentDialog.environmentKey}
              onChange={(e) =>
                updateDeployWorkflowDialog(
                  (settings) => (settings.environmentKey = e.target.value)
                )
              }
            />
            <TextField
              label="Run workflow from branch"
              value={deploymentDialog.ref}
              onChange={(e) =>
                updateDeployWorkflowDialog(
                  (settings) => (settings.ref = e.target.value)
                )
              }
            />
            <Autocomplete
              style={{ gridColumn: '1 / span 5' }}
              multiple
              options={[]}
              freeSolo
              value={Object.entries(deploymentDialog.extraArgs).map(
                ([key, value]) => `${key}=${value}`
              )}
              renderInput={(params) => (
                <TextField
                  label="Extra workflow args (press Enter to add)"
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
                updateDeployWorkflowDialog(
                  (settings) => (settings.extraArgs = newArgs)
                )
              }}
            />
          </DialogContent>
          <DialogActions style={{ padding: '2rem' }}>
            <Button
              type="submit"
              disabled={!valid}
              variant="contained"
              color="primary"
            >
              Save
            </Button>
            <Button onClick={cancelEditDeployment}>Cancel</Button>
          </DialogActions>
        </form>
      ) : null}
    </Dialog>
  )
}

function selectWorkflow(
  state: DeploymentDialogState,
  workflow: DispatchWorkflow | null
) {
  state.workflowId = workflow?.id ?? 0

  if (!workflow) return

  const deployInputs = state.manualWorkflowHandling
    ? undefined
    : workflow.deployInputs

  if (shouldReplaceWithInference(state.releaseKey, DEFAULT_RELEASE_KEY)) {
    state.releaseKey = deployInputs?.releaseKey ?? DEFAULT_RELEASE_KEY
  }

  if (
    shouldReplaceWithInference(state.environmentKey, DEFAULT_ENVIRONMENT_KEY)
  ) {
    state.environmentKey =
      deployInputs?.environmentKey ?? DEFAULT_ENVIRONMENT_KEY
  }
}

function updateManualWorkflowHandling(
  state: DeploymentDialogState,
  manualWorkflowHandling: boolean
) {
  state.manualWorkflowHandling = manualWorkflowHandling
  state.workflowId = 0
}

function shouldReplaceWithInference(value: string, defaultValue: string) {
  return !value || value === defaultValue
}
