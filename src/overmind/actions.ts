import { some } from 'lodash'
import { clone } from 'lodash-es'
import { Action, AsyncAction } from 'overmind'
import {
  ApplicationDialogState,
  createApplicationConfig,
  createDeployWorkflowSettings,
  DeployWorkflowCodec,
  DeployWorkflowSettings,
  EnvironmentDialogState,
  RepoModel,
} from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const showNewApplicationModal: Action = ({
  state: { newApplicationDialog: applicationDialog, selectedApplication },
}) => {
  if (selectedApplication) {
    applicationDialog.open = true
    applicationDialog.repo = clone(selectedApplication.repo)
    applicationDialog.name = ''
    applicationDialog.warning = undefined
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
  environment: string
}> = async ({ effects, state }, { release, environment }) => {
  // if (!selectedRepo || !DeployWorkflowCodec.is(deploySettingsForSelectedRepo))
  //   return
  // const env = environment.split('-').pop() || environment
  // if (
  //   window.confirm(
  //     `Are you sure you want to deploy "${release}" to "${env}" in "${selectedRepo.owner}/${selectedRepo.name}@${deploySettingsForSelectedRepo.ref}"?`
  //   )
  // ) {
  //   const { owner, name } = selectedRepo
  //   const {
  //     ref,
  //     workflowId,
  //     environmentKey,
  //     releaseKey,
  //   } = deploySettingsForSelectedRepo
  //   await effects.restApi.octokit.actions.createWorkflowDispatch({
  //     owner,
  //     repo: name,
  //     ref,
  //     workflow_id: workflowId,
  //     inputs: { [releaseKey]: release, [environmentKey]: env },
  //   })
  // }
}

export const createNewApplication: Action<
  { repo: RepoModel; name: string },
  boolean
> = ({ state }, { repo, name }) => {
  if (
    Object.values(state.applicationsById).some(
      (app) => app.repo.id === repo.id && app.name === name
    )
  ) {
    state.newApplicationDialog.warning =
      'App with same name and repo already exists!'
    return false
  }
  const appConfig = createApplicationConfig(repo, name)
  state.applicationsById[appConfig.id] = appConfig
  state.selectedApplicationId = appConfig.id
  state.newApplicationDialog.open = false
  return true
}

export const cancelNewApplication: Action = ({ state }) => {
  state.newApplicationDialog.open = false
}

export const selectApplication: Action<string> = ({ state }, id) => {
  state.selectedApplicationId = id
}

export const editApplication: Action = ({ state }) => {
  if (state.selectedApplication) {
    state.editApplicationDialog.repo = clone(state.selectedApplication.repo)
    state.editApplicationDialog.name = state.selectedApplication.name
  }
  state.editApplicationDialog.open = true
}

export const cancelEditApplication: Action = ({ state }) => {
  state.editApplicationDialog.open = false
}

export const saveApplication: Action<
  { repo: RepoModel; name: string },
  boolean
> = ({ state }, { repo, name }) => {
  const id = state.selectedApplicationId
  if (
    some(
      state.applicationsById,
      (app) => app.id !== id && app.repo.id === repo.id && app.name === name
    )
  ) {
    state.editApplicationDialog.warning =
      'App with same name and repo already exists!'
    return false
  }
  state.applicationsById[id].repo = clone(repo)
  state.applicationsById[id].name = name
  state.editApplicationDialog.open = false
  return true
}

export const updateApplicationDialog: Action<{
  newOrEdit: 'new' | 'edit'
  update: (state: ApplicationDialogState) => void
}> = ({ state }, { newOrEdit, update }) => {
  const dialogState =
    newOrEdit === 'new'
      ? state.newApplicationDialog
      : state.editApplicationDialog
  dialogState.warning = undefined
  update(dialogState)
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

export const addEnvironment: Action = ({ state }) => {
  if (state.selectedApplication && state.addEnvironmentDialog?.environmentId) {
    state.selectedApplication.environmentSettingsById[
      state.addEnvironmentDialog.environmentId
    ] = {
      id: state.addEnvironmentDialog.environmentId,
      workflowInputValue: state.addEnvironmentDialog.workflowInputValue,
    }
  }
  state.addEnvironmentDialog = null
}
