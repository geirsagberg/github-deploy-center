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
  const environmentsByName = keyBy(filteredEnvironments, (e) => e.name)
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
                  getOptionSelected={(first, second) =>
                    first.name === second.name
                  }
                  value={
                    dialogState.environmentName
                      ? environmentsByName[dialogState.environmentName]
                      : null
                  }
                  openOnFocus
                  onChange={(_, value) =>
                    updateDialogState(
                      (state) => (state.environmentName = value?.name ?? '')
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
                          isLoading && !dialogState.environmentName ? (
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
                disabled={!dialogState.environmentName}
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
