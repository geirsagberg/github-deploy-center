import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { fromPairs } from 'lodash-es'
import { useActions, useAppState } from '../overmind'
import { SelectWorkflow } from './SelectWorkflow'

export const DeploymentDialog = () => {
  const { deploymentDialog } = useAppState()
  const { updateDeployWorkflowDialog, cancelEditDeployment, saveDeployment } =
    useActions()

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
              saveDeployment()
            }
          }}
        >
          <DialogTitle>Deploy workflow settings</DialogTitle>
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
              onChange={(id) =>
                updateDeployWorkflowDialog((state) => (state.workflowId = id))
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
