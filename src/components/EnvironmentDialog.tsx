import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Icon,
  TextField,
} from '@mui/material'
import type { FC } from 'react'
import { useEffect } from 'react'
import { useFetchEnvironments, useFetchWorkflows } from '../api/fetchHooks'
import { getEnvironmentChoiceOptions } from '../api/workflowDispatch'
import { useAppState } from '../store'
import type { EnvironmentDialogState } from '../store'
import {
  isDeployEnvironmentName,
  resolveUnambiguousEnvironmentWorkflowInputValue,
  sortEnvironments,
} from '../state/environments'
import type { EnvironmentSettings } from '../state/schemas'

type Option = {
  name: string
  inputValue?: string
}

const filter = createFilterOptions<Option>()

export const EnvironmentDialog: FC<{
  dialogState?: EnvironmentDialogState
  updateDialogState: (update: (state: EnvironmentDialogState) => void) => void
  title: string
  onSave: (settings: EnvironmentSettings) => void
  onCancel: () => void
  onDelete?: () => void | Promise<void>
  existingEnvironmentNames?: readonly string[]
  autoMapWorkflowInputValue?: boolean
}> = ({
  dialogState,
  autoMapWorkflowInputValue = false,
  onSave,
  onCancel,
  onDelete,
  title,
  updateDialogState,
  existingEnvironmentNames = [],
}) => {
  const { data, isLoading, error } = useFetchEnvironments()
  const { selectedApplication } = useAppState()
  const shouldFetchWorkflowChoices = autoMapWorkflowInputValue && !!dialogState
  const workflows = useFetchWorkflows({
    manualWorkflowHandling:
      selectedApplication?.deploySettings.manualWorkflowHandling,
    repo: shouldFetchWorkflowChoices ? selectedApplication?.repo : null,
  })
  const selectedWorkflow = workflows.data?.find(
    (workflow) => workflow.id === selectedApplication?.deploySettings.workflowId,
  )
  const workflowInputChoices =
    autoMapWorkflowInputValue && selectedApplication?.deploySettings
      ? getEnvironmentChoiceOptions(
          selectedWorkflow?.dispatchInputs,
          selectedApplication.deploySettings.environmentKey,
        )
      : undefined
  const workflowInputChoiceKey = workflowInputChoices?.join('\0') ?? ''
  const filteredEnvironments = sortEnvironments(
    (data || []).filter((d) => isDeployEnvironmentName(d.name)),
  )
  const filteredEnvironmentKey = filteredEnvironments
    .map((environment) => environment.name)
    .join('\0')
  const originalEnvironmentName = dialogState?.originalEnvironmentName
  const hasDuplicateEnvironmentName =
    !!dialogState?.environmentName &&
    existingEnvironmentNames.some(
      (name) =>
        name === dialogState.environmentName && name !== originalEnvironmentName,
    )
  const canSave =
    !!dialogState?.environmentName && !hasDuplicateEnvironmentName

  useEffect(() => {
    if (
      !dialogState ||
      !autoMapWorkflowInputValue ||
      dialogState.workflowInputValueTouched
    ) {
      return
    }

    const workflowInputValue =
      resolveUnambiguousEnvironmentWorkflowInputValue(
        dialogState.environmentName,
        filteredEnvironments,
        workflowInputChoices,
      ) ?? ''

    if (workflowInputValue === dialogState.workflowInputValue) return

    updateDialogState((state) => {
      if (!state.workflowInputValueTouched) {
        state.workflowInputValue = workflowInputValue
      }
    })
  }, [
    autoMapWorkflowInputValue,
    dialogState,
    dialogState?.environmentName,
    dialogState?.workflowInputValue,
    dialogState?.workflowInputValueTouched,
    filteredEnvironmentKey,
    updateDialogState,
    workflowInputChoiceKey,
    workflowInputChoices,
  ])

  return (
    <Dialog open={!!dialogState} fullWidth onClose={onCancel}>
      {dialogState ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const { environmentName, workflowInputValue } = dialogState
            environmentName &&
              onSave({
                workflowInputValue,
                name: environmentName,
              })
          }}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {error instanceof Error ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Alert severity="warning">
                    Could not fetch environments: {error.message}
                  </Alert>
                </Box>
                <DialogContentText>
                  Enter environment manually:
                </DialogContentText>
                <TextField
                  label="Environment name"
                  value={dialogState.environmentName}
                  onChange={(e) =>
                    updateDialogState((state) =>
                      updateEnvironmentName(
                        state,
                        e.target.value,
                        filteredEnvironments,
                        workflowInputChoices,
                        autoMapWorkflowInputValue,
                      ),
                    )
                  }
                />
                <TextField
                  label="Workflow input value"
                  value={dialogState.workflowInputValue}
                  onChange={(e) =>
                    updateDialogState((state) =>
                      updateWorkflowInputValue(state, e.target.value),
                    )
                  }
                />
              </>
            ) : (
              <>
                <Autocomplete
                  freeSolo
                  loading={isLoading}
                  options={filteredEnvironments.map<Option>((x) => x)}
                  value={dialogState.environmentName}
                  inputValue={dialogState.environmentName}
                  openOnFocus={!onDelete}
                  onChange={(_, value) =>
                    updateDialogState((state) =>
                      updateEnvironmentName(
                        state,
                        typeof value === 'string'
                          ? value
                          : value?.inputValue ?? value?.name ?? '',
                        filteredEnvironments,
                        workflowInputChoices,
                        autoMapWorkflowInputValue,
                      ),
                    )
                  }
                  onInputChange={(_, value, reason) => {
                    if (reason === 'input' || reason === 'clear') {
                      updateDialogState((state) =>
                        updateEnvironmentName(
                          state,
                          value,
                          filteredEnvironments,
                          workflowInputChoices,
                          autoMapWorkflowInputValue,
                        ),
                      )
                    }
                  }}
                  getOptionLabel={(option) =>
                    typeof option === 'string' ? option : option.name
                  }
                  isOptionEqualToValue={(option, value) =>
                    typeof value !== 'string' && option.name === value.name
                  }
                  filterOptions={(options, params) => {
                    const filtered = filter(options, params)

                    // Suggest the creation of a new value
                    if (params.inputValue !== '') {
                      filtered.push({
                        inputValue: params.inputValue,
                        name: `Add "${params.inputValue}"`,
                      })
                    }

                    return filtered
                  }}
                  renderInput={(params) => (
                    <TextField
                      autoFocus
                      variant="outlined"
                      label="Find or add environment"
                      {...params}
                      slotProps={{
                        ...params.slotProps,
                        htmlInput: {
                          ...params.slotProps.htmlInput,
                          'data-lpignore': true,
                        },
                        input: {
                          ...params.slotProps.input,
                          endAdornment:
                            isLoading && !dialogState.environmentName ? (
                              <CircularProgress size={24} sx={{ ml: 1 }} />
                            ) : null,
                        },
                      }}
                    />
                  )}
                />
                {selectedApplication?.deploySettings.type === 'workflow' &&
                  selectedApplication.deploySettings.environmentKey && (
                    <TextField
                      label="Workflow input value (defaults to environment name)"
                      fullWidth
                      variant="outlined"
                      value={dialogState.workflowInputValue}
                      onChange={(event) =>
                        updateDialogState((state) =>
                          updateWorkflowInputValue(
                            state,
                            event.target.value,
                          ),
                        )
                      }
                    />
                  )}
              </>
            )}
            {hasDuplicateEnvironmentName && (
              <Alert severity="warning">
                An environment named {dialogState.environmentName} already
                exists.
              </Alert>
            )}
          </DialogContent>
          <Box sx={{ p: 2, pt: 1 }}>
            <DialogActions>
              {onDelete && (
                <Button
                  color="error"
                  onClick={() => void onDelete()}
                  startIcon={<Icon>delete</Icon>}
                  sx={{ mr: 'auto' }}
                  type="button"
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canSave}
                variant="contained"
                color="primary"
              >
                Save
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </DialogActions>
          </Box>
        </form>
      ) : null}
    </Dialog>
  )
}

function updateEnvironmentName(
  state: EnvironmentDialogState,
  environmentName: string,
  githubEnvironments: readonly { name: string }[],
  workflowInputChoices: readonly string[] | undefined,
  autoMapWorkflowInputValue: boolean,
) {
  state.environmentName = environmentName

  if (autoMapWorkflowInputValue && !state.workflowInputValueTouched) {
    state.workflowInputValue =
      resolveUnambiguousEnvironmentWorkflowInputValue(
        environmentName,
        githubEnvironments,
        workflowInputChoices,
      ) ?? ''
  }
}

function updateWorkflowInputValue(
  state: EnvironmentDialogState,
  workflowInputValue: string,
) {
  state.workflowInputValue = workflowInputValue
  state.workflowInputValueTouched = true
}
