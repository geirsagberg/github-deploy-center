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
} from '@material-ui/core'
import { Alert, Autocomplete } from '@material-ui/lab'
import { orderBy } from 'lodash'
import { keyBy } from 'lodash-es'
import React, { FC } from 'react'
import { useFetchEnvironments } from '../api/fetchHooks'
import { useAppState } from '../overmind'
import { EnvironmentDialogState, EnvironmentSettings } from '../overmind/state'

export const EnvironmentDialog: FC<{
  dialogState?: EnvironmentDialogState
  updateDialogState: (update: (state: EnvironmentDialogState) => void) => void
  title: string
  onSave: (settings: EnvironmentSettings) => void
  onCancel: () => void
}> = ({ dialogState, onSave, onCancel, title, updateDialogState }) => {
  const { data, isLoading, error } = useFetchEnvironments()
  const { selectedApplication } = useAppState()
  const filteredEnvironments = orderBy(
    (data || []).filter((d) => d.name !== 'github-pages'),
    [
      (e) =>
        e.name
          .toLowerCase()
          .includes(selectedApplication?.name.split(' ')[0].toLowerCase() || '')
          ? 1
          : 2,
      (e) => e.name,
    ]
  )
  const environmentsById = keyBy(filteredEnvironments, (e) => e.id)
  return (
    <Dialog open={!!dialogState} fullWidth onClose={onCancel}>
      {dialogState ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const { environmentId, workflowInputValue } = dialogState
            environmentId &&
              onSave({
                id: environmentId,
                workflowInputValue,
                name: environmentsById[environmentId].name,
              })
          }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent style={{ height: '14rem' }}>
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
                  openOnFocus
                  onChange={(_, value) =>
                    updateDialogState(
                      (state) => (state.environmentId = value?.id ?? null)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      autoFocus
                      variant="outlined"
                      label="Search"
                      {...params}
                      inputProps={{
                        ...params.inputProps,
                        'data-lpignore': true,
                      }}
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
                <TextField
                  style={{ marginTop: '1rem' }}
                  label="Workflow input value (defaults to environment name)"
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
                disabled={!dialogState.environmentId}
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
