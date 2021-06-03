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
import { keyBy, orderBy } from 'lodash-es'
import { FC } from 'react'
import { useActions, useOvermindState } from '../overmind'
import { ApplicationDialogState, RepoModel } from '../overmind/state'
import { useFetchRepos } from './fetchHooks'
import { RepoSearchBox } from './RepoSearchView'

export const ApplicationDialog: FC<{
  dialogState: ApplicationDialogState
  updateDialogState: (update: (state: ApplicationDialogState) => void) => void
  title: string
  onSave: ({ repo, name }: { repo: RepoModel; name: string }) => boolean
  onCancel: () => void
}> = ({
  dialogState: { open, repoId, name, warning },
  updateDialogState,
  title,
  onSave,
  onCancel,
}) => {
  const { data, error, isLoading } = useFetchRepos()
  const reposById = keyBy(data ?? [], (r) => r.id)
  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())
  const repo = reposById[repoId]
  return (
    <Dialog open={open} fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          repo && onSave({ repo, name })
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
                selectedRepo={repo}
                setSelectedRepo={(repo) =>
                  updateDialogState((state) => (state.repoId = repo?.id ?? ''))
                }></RepoSearchBox>
              <br />
              <TextField
                variant="outlined"
                label="Name"
                placeholder="Defaults to same as repository"
                value={name}
                fullWidth
                onChange={(event) => {
                  updateDialogState(
                    (state) => (state.name = event.target.value)
                  )
                }}
              />
              {warning && (
                <Box mt={2}>
                  <Alert severity="warning">{warning}</Alert>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <Box p={2} pt={1}>
          <DialogActions>
            <Button
              type="submit"
              disabled={!repo || !!warning}
              variant="contained"
              color="primary">
              Save
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </DialogActions>
        </Box>
      </form>
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
