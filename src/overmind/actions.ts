import { some } from 'lodash'
import { clone } from 'lodash-es'
import { Action, AsyncAction } from 'overmind'
import {
  ApplicationDialogState,
  createApplicationConfig,
  createApplicationDialogState,
  createDeployWorkflowSettings,
  DeployWorkflowCodec,
  DeployWorkflowSettings,
  EnvironmentDialogState,
  EnvironmentSettings,
  RepoModel,
} from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const showNewApplicationModal: Action = ({ state }) => {
  state.newApplicationDialog = createApplicationDialogState()

  if (state.selectedApplication) {
    state.newApplicationDialog.repo = clone(state.selectedApplication.repo)
  }
}

export const updateWorkflowSettings: Action<
  (settings: DeployWorkflowSettings) => void
> = ({ state: { selectedApplication } }, update) => {
  if (selectedApplication) {
    let deploySettings = selectedApplication.deploySettings
    if (DeployWorkflowCodec.is(deploySettings)) {
      update(deploySettings)
    } else {
      deploySettings = createDeployWorkflowSettings({
        ref: selectedApplication.repo.defaultBranch,
      })
      update(deploySettings)
    }
  }
}

export const triggerDeployment: AsyncAction<{
  release: string
  environmentId: number
}> = async ({ effects, state }, { release, environmentId }) => {
  const { selectedApplication } = state

  if (!selectedApplication) return
  const { deploySettings, environmentSettingsById } = selectedApplication
  if (!DeployWorkflowCodec.is(deploySettings)) return

  if (!(environmentId in environmentSettingsById)) return

  const environmentSettings = environmentSettingsById[environmentId]

  const repo = selectedApplication.repo

  if (
    window.confirm(
      `Are you sure you want to deploy "${release}" to "${environmentSettings.name}" in "${repo.owner}/${repo.name}@${deploySettings.ref}"?`
    )
  ) {
    const { owner, name } = repo
    const { ref, workflowId, environmentKey, releaseKey } = deploySettings
    await effects.restApi.octokit.actions.createWorkflowDispatch({
      owner,
      repo: name,
      ref,
      workflow_id: workflowId,
      inputs: {
        [releaseKey]: release,
        [environmentKey]: environmentSettings.workflowInputValue,
      },
    })
  }
}

export const createNewApplication: Action<{ repo: RepoModel; name: string }> = (
  { state },
  { repo, name }
) => {
  if (!state.newApplicationDialog) return
  if (
    Object.values(state.applicationsById).some(
      (app) => app.repo.id === repo.id && app.name === name
    )
  ) {
    state.newApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }
  const appConfig = createApplicationConfig(repo, name)
  state.applicationsById[appConfig.id] = appConfig
  state.selectedApplicationId = appConfig.id
  state.newApplicationDialog = null
}

export const cancelNewApplication: Action = ({ state }) => {
  state.newApplicationDialog = null
}

export const selectApplication: Action<string> = ({ state }, id) => {
  state.selectedApplicationId = id
}

export const editApplication: Action = ({ state }) => {
  state.editApplicationDialog = createApplicationDialogState()
  if (state.selectedApplication) {
    state.editApplicationDialog.repo = clone(state.selectedApplication.repo)
    state.editApplicationDialog.name = state.selectedApplication.name
    state.editApplicationDialog.releaseFilter =
      state.selectedApplication.releaseFilter
  }
}

export const cancelEditApplication: Action = ({ state }) => {
  state.editApplicationDialog = null
}

export const saveApplication: Action<{
  repo: RepoModel
  name: string
  releaseFilter: string
}> = ({ state }, { repo, name, releaseFilter }) => {
  if (!state.editApplicationDialog) return
  const id = state.selectedApplicationId
  if (
    some(
      state.applicationsById,
      (app) => app.id !== id && app.repo.id === repo.id && app.name === name
    )
  ) {
    state.editApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }

  state.applicationsById[id].repo = clone(repo)
  state.applicationsById[id].name = name
  state.applicationsById[id].releaseFilter = releaseFilter
  state.editApplicationDialog = null
}

export const updateApplicationDialog: Action<{
  newOrEdit: 'new' | 'edit'
  update: (state: ApplicationDialogState) => void
}> = ({ state }, { newOrEdit, update }) => {
  const dialogState =
    newOrEdit === 'new'
      ? state.newApplicationDialog
      : state.editApplicationDialog
  if (dialogState) {
    dialogState.warning = undefined
    update(dialogState)
  }
}

export const showAddEnvironmentModal: Action = ({ state }) => {
  state.addEnvironmentDialog = {
    environmentId: null,
    workflowInputValue: '',
  }
}

export const updateEnvironmentDialog: Action<{
  addOrEdit: 'add' | 'edit'
  update: (state: EnvironmentDialogState) => void
}> = ({ state }, { addOrEdit, update }) => {
  const dialogState =
    addOrEdit === 'add'
      ? state.addEnvironmentDialog
      : state.editEnvironmentDialog
  if (dialogState) {
    update(dialogState)
  }
}

export const cancelAddEnvironment: Action = ({ state }) => {
  state.addEnvironmentDialog = null
}

export const addEnvironment: Action<EnvironmentSettings> = (
  { state },
  settings
) => {
  if (state.selectedApplication && state.addEnvironmentDialog?.environmentId) {
    state.selectedApplication.environmentSettingsById[
      state.addEnvironmentDialog.environmentId
    ] = settings
  }
  state.addEnvironmentDialog = null
}
