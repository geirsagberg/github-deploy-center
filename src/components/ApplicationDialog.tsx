import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material'
import { orderBy } from 'lodash-es'
import { FC } from 'react'
import { useFetchRepos } from '../api/fetchHooks'
import { useActions, useAppState } from '../overmind'
import { ApplicationDialogState, RepoModel } from '../overmind/state'
import { theme } from '../theme'
import Expander from './Expander'
import { RepoSearchBox } from './RepoSearchView'

export const ApplicationDialog: FC<{
  dialogState?: ApplicationDialogState
  newOrEdit: 'new' | 'edit'
  title: string
  onSave: ({
    repo,
    name,
    releaseFilter,
  }: {
    repo: RepoModel
    name: string
    releaseFilter: string
  }) => void
  onCancel: () => void
}> = ({ dialogState, newOrEdit, title, onSave, onCancel }) => {
  const { data, error, isLoading } = useFetchRepos()
  const { updateApplicationDialog, deleteApplication } = useActions()
  const updateDialogState = (update: (state: ApplicationDialogState) => void) =>
    updateApplicationDialog({ newOrEdit, update })
  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())
  return (
    <Dialog open={!!dialogState} fullWidth onClose={onCancel}>
      {dialogState ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            dialogState.repo &&
              onSave({
                repo: dialogState.repo,
                name: dialogState.name,
                releaseFilter: dialogState.releaseFilter,
              })
          }}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {error instanceof Error ? (
              <Alert severity="error">{error.message}</Alert>
            ) : (
              <>
                <DialogContentText>Select repository</DialogContentText>
                <Box
                  display="flex"
                  flexDirection="column"
                  style={{ gap: '1rem' }}
                >
                  <RepoSearchBox
                    isLoading={isLoading}
                    options={options}
                    selectedRepo={dialogState.repo}
                    setSelectedRepo={(repo) =>
                      updateDialogState((state) => (state.repo = repo))
                    }
                  />
                  <TextField
                    variant="outlined"
                    label="Name"
                    inputProps={{
                      'data-lpignore': true,
                    }}
                    placeholder="Defaults to same as repository"
                    value={dialogState.name}
                    fullWidth
                    onChange={(event) => {
                      updateDialogState(
                        (state) => (state.name = event.target.value)
                      )
                    }}
                  />
                  <Box
                    display="flex"
                    alignItems="center"
                    style={{ gap: '1rem' }}
                  >
                    <TextField
                      style={{ flex: 2 }}
                      variant="outlined"
                      label="Release filter prefix"
                      placeholder="Filter which release tags to show for this application"
                      value={dialogState.releaseFilter}
                      fullWidth
                      onChange={(event) =>
                        updateDialogState(
                          (state) =>
                            (state.releaseFilter =
                              event.target.value.toLowerCase())
                        )
                      }
                    />
                    <Button
                      color="secondary"
                      variant="contained"
                      onClick={() =>
                        updateDialogState(
                          (state) =>
                            (state.releaseFilter =
                              state.name.toLowerCase().replaceAll(' ', '-') +
                              '-v')
                        )
                      }
                    >
                      Set filter from name
                    </Button>
                  </Box>
                </Box>

                {dialogState.warning && (
                  <Box mt={2}>
                    <Alert severity="warning">{dialogState.warning}</Alert>
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          <Box p={2} pt={1}>
            <DialogActions>
              {newOrEdit === 'edit' && (
                <Button
                  style={{ color: theme.palette.error.main }}
                  onClick={deleteApplication}
                >
                  Delete
                </Button>
              )}
              <Expander />
              <Button
                type="submit"
                disabled={!dialogState.repo || !!dialogState.warning}
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

export const NewApplicationDialog = () => {
  const { newApplicationDialog } = useAppState()
  const { createNewApplication, cancelNewApplication } = useActions()
  return (
    <ApplicationDialog
      dialogState={newApplicationDialog}
      newOrEdit="new"
      title="New application"
      onSave={createNewApplication}
      onCancel={cancelNewApplication}
    />
  )
}

export const EditApplicationDialog = () => {
  const { editApplicationDialog } = useAppState()
  const { saveApplication, cancelEditApplication } = useActions()
  return (
    <ApplicationDialog
      dialogState={editApplicationDialog}
      newOrEdit="edit"
      title="Edit application"
      onSave={saveApplication}
      onCancel={cancelEditApplication}
    />
  )
}
