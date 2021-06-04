import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { orderBy } from 'lodash-es'
import React, { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import { ApplicationDialogState, RepoModel } from '../overmind/state'
import { useFetchRepos } from './fetchHooks'
import { RepoSearchBox } from './RepoSearchView'

export const ApplicationDialog: FC<{
  dialogState: ApplicationDialogState | null
  updateDialogState: (update: (state: ApplicationDialogState) => void) => void
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
}> = ({ dialogState, updateDialogState, title, onSave, onCancel }) => {
  const { data, error, isLoading } = useFetchRepos()
  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())
  return (
    <Dialog open={!!dialogState} fullWidth>
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
          }}>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {error instanceof Error ? (
              <Alert severity="error">{error.message}</Alert>
            ) : (
              <>
                <DialogContentText>Select repository</DialogContentText>
                <RepoSearchBox
                  isLoading={isLoading}
                  options={options}
                  selectedRepo={dialogState.repo}
                  setSelectedRepo={(repo) =>
                    updateDialogState((state) => (state.repo = repo))
                  }></RepoSearchBox>
                <TextField
                  style={{ marginTop: '1rem' }}
                  variant="outlined"
                  label="Name"
                  placeholder="Defaults to same as repository"
                  value={dialogState.name}
                  fullWidth
                  onChange={(event) => {
                    updateDialogState(
                      (state) => (state.name = event.target.value)
                    )
                  }}
                />
                <TextField
                  style={{ marginTop: '1rem' }}
                  variant="outlined"
                  label="Release filter prefix"
                  placeholder="Filter which release tags to show for this application"
                  value={dialogState.releaseFilter}
                  fullWidth
                  onChange={(event) =>
                    updateDialogState(
                      (state) => (state.releaseFilter = event.target.value)
                    )
                  }
                />
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
              <Button
                type="submit"
                disabled={!dialogState.repo || !!dialogState.warning}
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

export const NewApplicationDialog: FC = () => {
  const { newApplicationDialog } = useOvermindState()
  const {
    createNewApplication,
    updateApplicationDialog,
    cancelNewApplication,
  } = useActions()
  return (
    <ApplicationDialog
      dialogState={newApplicationDialog}
      updateDialogState={(update) =>
        updateApplicationDialog({ newOrEdit: 'new', update })
      }
      title="New application"
      onSave={createNewApplication}
      onCancel={cancelNewApplication}
    />
  )
}

export const EditApplicationDialog: FC = () => {
  const { editApplicationDialog } = useOvermindState()
  const { saveApplication, updateApplicationDialog, cancelEditApplication } =
    useActions()
  return (
    <ApplicationDialog
      dialogState={editApplicationDialog}
      updateDialogState={(update) =>
        updateApplicationDialog({ newOrEdit: 'edit', update })
      }
      title="Edit application"
      onSave={saveApplication}
      onCancel={cancelEditApplication}
    />
  )
}
