import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { some } from 'lodash'
import { clone, get, set } from 'lodash-es'
import { Context } from '.'
import { showConfirm } from '../utils/dialog'
import {
  ApplicationDialogState,
  ApplicationsByIdCodec,
  AppState,
  createApplicationConfig,
  createApplicationDialogState,
  createDeployWorkflowSettings,
  DeploymentDialogState,
  DeployWorkflowCodec,
  DeployWorkflowSettings,
  EnvironmentDialogState,
  EnvironmentSettings,
  RepoModel,
} from './state'

export const setToken = ({ state }: Context, token: string) => {
  state.token = token
}

export const showSettings = ({ state }: Context) => (state.settingsDialog = {})

export const hideSettings = ({ state }: Context) => delete state.settingsDialog

export const setState = <T>(
  { state }: Context,
  { selector, value }: { selector: (state: AppState) => T; value: T }
) => {
  const path = selector.toString().replace(/^.*?\./, '')
  if (get(state, path) === undefined) {
    throw Error('Unkown path ' + path)
  }
  set(state, path, value)
}

export const showNewApplicationModal = ({ state }: Context) => {
  state.newApplicationDialog = createApplicationDialogState()

  if (state.selectedApplication) {
    state.newApplicationDialog.repo = clone(state.selectedApplication.repo)
  }
}

export const updateWorkflowSettings = (
  { state: { selectedApplication } }: Context,
  update: (settings: DeployWorkflowSettings) => void
) => {
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

export const updateDeployWorkflowDialog = (
  { state: { deploymentDialog } }: Context,
  update: (state: DeploymentDialogState) => void
) => {
  if (deploymentDialog) {
    update(deploymentDialog)
  }
}

export const triggerDeployment = async (
  { effects, state }: Context,
  {
    release,
    environmentId,
  }: {
    release: string
    environmentId: number
  }
) => {
  const { selectedApplication } = state

  if (!selectedApplication) return
  const { deploySettings, environmentSettingsById } = selectedApplication
  if (!DeployWorkflowCodec.is(deploySettings)) return

  if (!(environmentId in environmentSettingsById)) return

  const environmentSettings = environmentSettingsById[environmentId]

  const repo = selectedApplication.repo

  if (
    showConfirm(
      `Are you sure you want to deploy "${release}" to "${environmentSettings.name}" in "${repo.owner}/${repo.name}@${deploySettings.ref}"?`
    )
  ) {
    const { owner, name } = repo
    const { ref, workflowId, environmentKey, releaseKey, extraArgs } =
      deploySettings
    await effects.restApi.octokit.actions.createWorkflowDispatch({
      owner,
      repo: name,
      ref,
      workflow_id: workflowId,
      inputs: {
        [releaseKey]: release,
        [environmentKey]:
          environmentSettings.workflowInputValue || environmentSettings.name,
        ...extraArgs,
      },
    })
  }
}

export const createNewApplication = (
  { state, actions }: Context,
  {
    repo,
    name,
    releaseFilter,
  }: {
    repo: RepoModel
    name: string
    releaseFilter: string
  }
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
  const appConfig = createApplicationConfig(repo, name, releaseFilter)
  state.applicationsById[appConfig.id] = appConfig
  state.selectedApplicationId = appConfig.id
  delete state.newApplicationDialog
  actions.editDeployment()
}

export const cancelNewApplication = ({ state }: Context) => {
  delete state.newApplicationDialog
}

export const selectApplication = ({ state }: Context, id: string) => {
  state.selectedApplicationId = id
}

export const editApplication = ({ state }: Context) => {
  state.editApplicationDialog = createApplicationDialogState()
  if (state.selectedApplication) {
    state.editApplicationDialog.repo = clone(state.selectedApplication.repo)
    state.editApplicationDialog.name = state.selectedApplication.name
    state.editApplicationDialog.releaseFilter =
      state.selectedApplication.releaseFilter
  }
}

export const editDeployment = ({ state }: Context) => {
  const deploySettings = state.selectedApplication?.deploySettings
  if (DeployWorkflowCodec.is(deploySettings))
    state.deploymentDialog = clone(deploySettings)
}

export const saveDeployment = ({ state }: Context) => {
  if (state.selectedApplication && state.deploymentDialog) {
    state.selectedApplication.deploySettings = clone(state.deploymentDialog)
  }
  delete state.deploymentDialog
}

export const cancelEditDeployment = ({ state }: Context) => {
  delete state.deploymentDialog
}

export const cancelEditApplication = ({ state }: Context) => {
  delete state.editApplicationDialog
}

export const saveApplication = (
  { state }: Context,
  {
    repo,
    name,
    releaseFilter,
  }: {
    repo: RepoModel
    name: string
    releaseFilter: string
  }
) => {
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
  delete state.editApplicationDialog
}

export const updateApplicationDialog = (
  { state }: Context,
  {
    newOrEdit,
    update,
  }: {
    newOrEdit: 'new' | 'edit'
    update: (state: ApplicationDialogState) => void
  }
) => {
  const dialogState =
    newOrEdit === 'new'
      ? state.newApplicationDialog
      : state.editApplicationDialog
  if (dialogState) {
    dialogState.warning = undefined
    update(dialogState)
  }
}

export const deleteApplication = ({ state }: Context) => {
  if (
    !!state.selectedApplication &&
    showConfirm(
      'Are you sure you want to delete ' + state.selectedApplication.name + '?'
    )
  ) {
    delete state.applicationsById[state.selectedApplicationId]
    delete state.editApplicationDialog
  }
}

export const showAddEnvironmentModal = ({ state }: Context) => {
  state.addEnvironmentDialog = {
    environmentId: null,
    workflowInputValue: '',
  }
}

export const updateEnvironmentDialog = (
  { state }: Context,
  {
    addOrEdit,
    update,
  }: {
    addOrEdit: 'add' | 'edit'
    update: (state: EnvironmentDialogState) => void
  }
) => {
  const dialogState =
    addOrEdit === 'add'
      ? state.addEnvironmentDialog
      : state.editEnvironmentDialog
  if (dialogState) {
    update(dialogState)
  }
}

export const cancelAddEnvironment = ({ state }: Context) => {
  delete state.addEnvironmentDialog
}

export const addEnvironment = (
  { state }: Context,
  settings: EnvironmentSettings
) => {
  if (state.selectedApplication && state.addEnvironmentDialog?.environmentId) {
    state.selectedApplication.environmentSettingsById[
      state.addEnvironmentDialog.environmentId
    ] = settings
  }
  delete state.addEnvironmentDialog
}

export const removeEnvironment = ({ state }: Context, id: number) => {
  if (state.selectedApplication) {
    delete state.selectedApplication.environmentSettingsById[id]
  }
}

export const exportApplications = async ({ state, effects }: Context) => {
  await effects.downloadJson(state.applicationsById, 'gdc-applications.json')
}

export const importApplications = async ({ state, effects }: Context) => {
  const json = await effects.uploadJson()
  if (json) {
    const imported = JSON.parse(json)
    const applications = pipe(
      ApplicationsByIdCodec.decode(imported),
      getOrElse((e) => {
        console.error(e)
        return {}
      })
    )
    state.applicationsById = {
      ...state.applicationsById,
      ...applications,
    }
  }
}

export { onInitializeOvermind } from './onInitialize'
