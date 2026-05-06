import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { fromPairs } from 'lodash-es'
import type { DeploymentDialogState } from '../store'
import {
  selectDeployWorkflow,
  updateDeployWorkflowMetadata,
  updateManualWorkflowHandling,
} from '../state/deployWorkflow'
import type { RepoModel } from '../state/schemas'
import { SelectWorkflow } from './SelectWorkflow'

export function DeploymentSettingsFields({
  applicationName,
  deploySettings,
  disabled = false,
  repo,
  updateDialogState,
}: {
  applicationName?: string
  deploySettings: DeploymentDialogState
  disabled?: boolean
  repo?: RepoModel | null
  updateDialogState: (update: (state: DeploymentDialogState) => void) => void
}) {
  return (
    <Stack sx={{ gap: 2 }}>
      <Stack
        sx={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography component="h3" variant="subtitle1">
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
                disabled={disabled}
                size="small"
                checked={deploySettings.manualWorkflowHandling}
                onChange={(event) =>
                  updateDialogState((state) =>
                    updateManualWorkflowHandling(state, event.target.checked),
                  )
                }
                sx={{ p: 0.5 }}
              />
            }
            label="Manual"
          />
        </Tooltip>
      </Stack>
      <SelectWorkflow
        applicationName={applicationName}
        disabled={disabled}
        workflowId={deploySettings.workflowId}
        manualWorkflowHandling={deploySettings.manualWorkflowHandling}
        repo={repo}
        onChange={(workflow) =>
          updateDialogState((state) => selectDeployWorkflow(state, workflow))
        }
        onWorkflowLoaded={(workflow) =>
          updateDialogState((state) =>
            updateDeployWorkflowMetadata(state, workflow),
          )
        }
      />
      <TextField
        disabled={disabled}
        label="Release input name"
        value={deploySettings.releaseKey}
        onChange={(e) =>
          updateDialogState(
            (settings) => (settings.releaseKey = e.target.value),
          )
        }
      />
      <TextField
        disabled={disabled}
        label="Environment input name (optional)"
        value={deploySettings.environmentKey}
        onChange={(e) =>
          updateDialogState(
            (settings) => (settings.environmentKey = e.target.value),
          )
        }
      />
      <TextField
        disabled={disabled}
        label="Run workflow from branch"
        value={deploySettings.ref}
        onChange={(e) =>
          updateDialogState((settings) => (settings.ref = e.target.value))
        }
      />
      <Autocomplete
        disabled={disabled}
        style={{ gridColumn: '1 / span 5' }}
        multiple
        options={[]}
        freeSolo
        value={Object.entries(deploySettings.extraArgs).map(
          ([key, value]) => `${key}=${value}`,
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
          updateDialogState((settings) => (settings.extraArgs = newArgs))
        }}
      />
    </Stack>
  )
}
