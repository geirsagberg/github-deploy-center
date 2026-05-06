import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
} from '@mui/material'
import { orderBy } from 'lodash-es'
import type { FC } from 'react'
import { useFetchEnvironments, useFetchRepos } from '../api/fetchHooks'
import { useActions, useAppState } from '../store'
import type { ApplicationDialogState, DeploymentDialogState } from '../store'
import { createDeploySettings } from '../state/schemas'
import type { GitHubEnvironment, RepoModel } from '../state/schemas'
import { theme } from '../theme'
import { CredentialErrorAlert } from './CredentialErrorAlert'
import { DeploymentSettingsFields } from './DeploymentSettingsFields'
import Expander from './Expander'
import { RepoSearchBox } from './RepoSearchView'

export const ApplicationDialog: FC<{
  dialogState?: ApplicationDialogState
  newOrEdit: 'new' | 'edit'
  title: string
  onSave: ({
    repo,
    name,
    deploySettings,
    githubEnvironments,
    releaseFilter,
  }: {
    repo: RepoModel
    name: string
    deploySettings: DeploymentDialogState
    githubEnvironments: GitHubEnvironment[]
    releaseFilter: string
  }) => void
  onCancel: () => void
}> = ({ dialogState, newOrEdit, title, onSave, onCancel }) => {
  const repoQuery = useFetchRepos()
  const environments = useFetchEnvironments(dialogState?.repo ?? null)
  const { data, error } = repoQuery
  const { updateApplicationDialog, deleteApplication } = useActions()
  const updateDialogState = (update: (state: ApplicationDialogState) => void) =>
    updateApplicationDialog({ newOrEdit, update })
  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())
  const repoStatusText = getRepoStatusText(repoQuery)
  const canSave =
    !!dialogState?.repo &&
    isDeploySettingsValid(dialogState.deploySettings) &&
    !dialogState.warning

  return (
    <Dialog open={!!dialogState} fullWidth onClose={onCancel}>
      {dialogState ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            canSave &&
              dialogState.repo &&
              onSave({
                repo: dialogState.repo,
                name: dialogState.name,
                deploySettings: dialogState.deploySettings,
                githubEnvironments: environments.data ?? [],
                releaseFilter: dialogState.releaseFilter,
              })
          }}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {error instanceof Error ? (
              <CredentialErrorAlert title="Could not load repositories" />
            ) : (
              <Stack sx={{ gap: 1 }}>
                <Stack sx={{ gap: 2 }}>
                  <RepoSearchBox
                    isLoading={
                      repoQuery.isInitialLoading ||
                      repoQuery.isFetchingNextPage ||
                      repoQuery.isRefreshing
                    }
                    statusText={repoStatusText}
                    onLoadMore={
                      repoQuery.hasNextPage && !repoQuery.isFetching
                        ? () =>
                            void repoQuery.fetchNextPage({
                              cancelRefetch: false,
                            })
                        : undefined
                    }
                    options={options}
                    selectedRepo={dialogState.repo}
                    setSelectedRepo={(repo) =>
                      updateDialogState((state) => selectRepo(state, repo))
                    }
                  />
                  <TextField
                    variant="outlined"
                    label="Name"
                    slotProps={{
                      htmlInput: {
                        'data-lpignore': true,
                      },
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
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
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
                      disabled={!dialogState.name.trim()}
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
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Box
                  aria-disabled={!dialogState.repo}
                  sx={{
                    opacity: dialogState.repo ? 1 : 0.56,
                    pointerEvents: dialogState.repo ? 'auto' : 'none',
                  }}
                >
                  <DeploymentSettingsFields
                    applicationName={dialogState.name}
                    deploySettings={dialogState.deploySettings}
                    disabled={!dialogState.repo}
                    repo={dialogState.repo}
                    updateDialogState={(update) =>
                      updateDialogState((state) =>
                        update(state.deploySettings)
                      )
                    }
                  />
                </Box>

                {dialogState.warning && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="warning">{dialogState.warning}</Alert>
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <Box sx={{ p: 2, pt: 1 }}>
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

function getRepoStatusText({
  hasNextPage,
  isFetchingNextPage,
  isInitialLoading,
  isRefreshing,
  loadedCount,
  totalCount,
}: ReturnType<typeof useFetchRepos>) {
  if (isInitialLoading) return 'Loading repositories...'

  if (hasNextPage || isFetchingNextPage) {
    return `Loaded ${formatRepoCount(loadedCount, totalCount)} repositories. Still loading...`
  }

  if (isRefreshing) {
    return `Showing ${loadedCount} cached repositories while refreshing.`
  }
}

function formatRepoCount(loadedCount: number, totalCount?: number) {
  return totalCount ? `${loadedCount} of ${totalCount}` : `${loadedCount}`
}

function selectRepo(state: ApplicationDialogState, repo: RepoModel | null) {
  const previousRepo = state.repo
  state.repo = repo

  if (!repo) {
    state.deploySettings = createDeploySettings({ ref: '' })
    return
  }

  if (!state.name.trim() || state.name === previousRepo?.name) {
    state.name = repo.name
  }

  if (previousRepo?.id !== repo.id || !state.deploySettings.ref) {
    state.deploySettings = createDeploySettings({ ref: repo.defaultBranch })
  }
}

function isDeploySettingsValid({
  releaseKey,
  ref,
  workflowId,
}: DeploymentDialogState) {
  return Boolean(workflowId && releaseKey && ref)
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
