import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@material-ui/core'
import { Alert, Autocomplete } from '@material-ui/lab'
import { orderBy } from 'lodash'
import { keyBy } from 'lodash-es'
import { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import {
  DeployWorkflowCodec,
  EnvironmentDialogState,
  EnvironmentSettings,
} from '../overmind/state'
import { useFetchEnvironments } from './fetchHooks'

const EnvironmentDialog: FC<{
  dialogState: EnvironmentDialogState | null
  updateDialogState: (update: (state: EnvironmentDialogState) => void) => void
  title: string
  onSave: (settings: EnvironmentSettings) => void
  onCancel: () => void
}> = ({ dialogState, onSave, onCancel, title, updateDialogState }) => {
  const { data, isLoading, error } = useFetchEnvironments()
  const filteredEnvironments = orderBy(
    (data || []).filter((d) => d.name !== 'github-pages'),
    (e) => e.name
  )
  const environmentsById = keyBy(filteredEnvironments, (e) => e.id)
  return (
    <Dialog open={!!dialogState} fullWidth>
      {dialogState ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const { environmentId, workflowInputValue } = dialogState
            environmentId &&
              workflowInputValue &&
              onSave({
                id: environmentId,
                workflowInputValue,
                name: environmentsById[environmentId].name,
              })
          }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {error instanceof Error ? (
              <Alert severity="error">{error.message}</Alert>
            ) : (
              <>
                <DialogContentText>Select environment</DialogContentText>
                <Autocomplete
                  loading={isLoading}
                  options={filteredEnvironments}
                  getOptionLabel={(e) => e.name}
                  getOptionSelected={(first, second) => first.id === second.id}
                  value={
                    dialogState.environmentId
                      ? environmentsById[dialogState.environmentId]
                      : null
                  }
                  onChange={(_, value) =>
                    updateDialogState(
                      (state) => (state.environmentId = value?.id ?? null)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      variant="outlined"
                      label="Search"
                      {...params}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment:
                          isLoading && !dialogState.environmentId ? (
                            <Box
                              maxWidth={24}
                              maxHeight={24}
                              ml={1}
                              component={CircularProgress}></Box>
                          ) : null,
                      }}
                    />
                  )}
                />
                <br />
                <TextField
                  label="Workflow input value"
                  fullWidth
                  variant="outlined"
                  value={dialogState.workflowInputValue}
                  onChange={(event) =>
                    updateDialogState(
                      (state) => (state.workflowInputValue = event.target.value)
                    )
                  }
                />
              </>
            )}
          </DialogContent>
          <Box p={2} pt={1}>
            <DialogActions>
              <Button
                type="submit"
                disabled={
                  !dialogState.environmentId || !dialogState.workflowInputValue
                }
                variant="contained"
                color="primary">
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

const AddEnvironmentDialog: FC = () => {
  const { addEnvironmentDialog } = useOvermindState()
  const { cancelAddEnvironment, addEnvironment, updateEnvironmentDialog } =
    useActions()
  return (
    <EnvironmentDialog
      dialogState={addEnvironmentDialog}
      onCancel={cancelAddEnvironment}
      onSave={addEnvironment}
      title="Add environment"
      updateDialogState={(update) =>
        updateEnvironmentDialog({ addOrEdit: 'add', update })
      }
    />
  )
}

export const EnvironmentsView: FC = () => {
  const { selectedApplication } = useOvermindState()
  const { showAddEnvironmentModal } = useActions()

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings) ||
    !selectedApplication.deploySettings.workflowId
  ) {
    return null
  }

  return (
    <>
      <Typography variant="h4">Environments</Typography>
      <Button variant="contained" onClick={showAddEnvironmentModal}>
        Add environment
      </Button>
      <AddEnvironmentDialog />
    </>
  )
}
