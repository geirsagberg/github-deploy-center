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
import { Alert, Autocomplete, createFilterOptions } from '@material-ui/lab'
import { identity } from 'fp-ts/lib/function'
import { orderBy } from 'lodash'
import React, { FC } from 'react'
import { useFetchEnvironments } from '../api/fetchHooks'
import { useAppState } from '../overmind'
import { EnvironmentDialogState, EnvironmentSettings } from '../overmind/state'

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
                  freeSolo
                  loading={isLoading}
                  options={filteredEnvironments.map<Option>(identity)}
                  value={dialogState.environmentName}
                  openOnFocus
                  onChange={(_, value) =>
                    updateDialogState(
                      (state) =>
                        (state.environmentName =
                          typeof value === 'string'
                            ? value
                            : value?.inputValue ?? value?.name ?? '')
                    )
                  }
                  getOptionLabel={(option) =>
                    typeof option === 'string' ? option : option.name
                  }
                  getOptionSelected={(first, second) =>
                    first.name === second.name
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
