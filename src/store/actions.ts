import dayjs from 'dayjs'
import { clone, some } from 'lodash-es'
import { snapshot } from 'valtio/vanilla'
import {
  applicationsByIdSchema,
  createApplicationConfig,
} from '../state/schemas'
import type {
  AppSettings,
  DeploySettings,
  EnvironmentSettings,
  RepoModel,
} from '../state/schemas'
import { showConfirm } from '../utils/dialog'
import {
  deleteActiveApplication,
  getActiveWorkspace,
  getSelectedApplication,
  selectActiveApplication,
  setActiveAccountApplications,
  setActiveAccountToken,
} from './accounts'
import { appState } from './state'
import { createApplicationDialogState } from './state'
import type {
  ApplicationDialogState,
  DeploymentDialogState,
  EnvironmentDialogState,
} from './state'
import { downloadJson, restApi, uploadJson } from './services'
import { getDeploymentId } from './utils'

export const setToken = (token: string) => {
  setActiveAccountToken(appState, token)
}

export const showSettings = () => (appState.settingsDialog = {})

export const hideSettings = () => delete appState.settingsDialog

export const setAppSetting = <Key extends keyof AppSettings>(
  setting: Key,
  value: AppSettings[Key]
) => {
  appState.settings[setting] = value
}

export const showNewApplicationModal = () => {
  appState.newApplicationDialog = createApplicationDialogState()

  const selectedApplication = getSelectedApplication(appState)
  if (selectedApplication) {
    appState.newApplicationDialog.repo = clone(selectedApplication.repo)
  }
}

export const updateDeployWorkflowDialog = (
  update: (state: DeploymentDialogState) => void
) => {
  if (appState.deploymentDialog) {
    update(appState.deploymentDialog)
  }
}

export const triggerDeployment = async ({
  release,
  environmentName,
}: {
  release: string
  environmentName: string
}) => {
  const { selectedApplication } = appState

  if (!selectedApplication) return
  const { deploySettings, environmentSettingsByName } = selectedApplication

  if (!(environmentName in environmentSettingsByName)) return

  const environmentSettings = environmentSettingsByName[environmentName]

  const { repo } = selectedApplication

  if (
    await showConfirm(
      `Are you sure you want to deploy "${release}" to "${environmentSettings.name}" in "${repo.owner}/${repo.name}@${deploySettings.ref}"?`
    )
  ) {
    const deploymentId = getDeploymentId({
      release,
      environment: environmentName,
      owner: repo.owner,
      repo: repo.name,
    })
    getActiveWorkspace(appState).pendingDeployments[deploymentId] = {
      createdAt: dayjs().toISOString(),
    }

    const { owner, name } = repo
    const { ref, workflowId, environmentKey, releaseKey, extraArgs } =
      deploySettings

    const environmentArg =
      environmentSettings.workflowInputValue || environmentSettings.name

    const inputs = environmentKey
      ? {
          [releaseKey]: release,
          [environmentKey]: environmentArg,
          ...extraArgs,
        }
      : {
          [releaseKey]: release,
          ...extraArgs,
        }

    await restApi.octokit.actions.createWorkflowDispatch({
      owner,
      repo: name,
      ref,
      workflow_id: workflowId,
      inputs,
    })
  }
}

export const createNewApplication = ({
  repo,
  name,
  releaseFilter,
}: {
  repo: RepoModel
  name: string
  releaseFilter: string
}) => {
  if (!appState.newApplicationDialog) return
  const workspace = getActiveWorkspace(appState)
  if (
    Object.values(workspace.applicationsById).some(
      (app) => app.repo.id === repo.id && app.name === name
    )
  ) {
    appState.newApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }
  const appConfig = createApplicationConfig(clone(repo), name, releaseFilter)
  workspace.applicationsById[appConfig.id] = appConfig
  workspace.selectedApplicationId = appConfig.id
  delete appState.newApplicationDialog
  actions.editDeployment()
}

export const cancelNewApplication = () => {
  delete appState.newApplicationDialog
}

export const selectApplication = (id: string) => {
  selectActiveApplication(appState, id)
}

export const editApplication = () => {
  appState.editApplicationDialog = createApplicationDialogState()
  if (appState.selectedApplication) {
    appState.editApplicationDialog.repo = clone(appState.selectedApplication.repo)
    appState.editApplicationDialog.name = appState.selectedApplication.name
    appState.editApplicationDialog.releaseFilter =
      appState.selectedApplication.releaseFilter
  }
}

export const editDeployment = () => {
  const deploySettings = appState.selectedApplication?.deploySettings
  appState.deploymentDialog = clone(deploySettings)
}

export const saveDeployment = () => {
  if (appState.selectedApplication && appState.deploymentDialog) {
    appState.selectedApplication.deploySettings = clone(appState.deploymentDialog)
  }
  delete appState.deploymentDialog
}

export const cancelEditDeployment = () => {
  delete appState.deploymentDialog
}

export const cancelEditApplication = () => {
  delete appState.editApplicationDialog
}

export const saveApplication = ({
  repo,
  name,
  releaseFilter,
}: {
  repo: RepoModel
  name: string
  releaseFilter: string
}) => {
  if (!appState.editApplicationDialog) return
  const workspace = getActiveWorkspace(appState)
  const id = workspace.selectedApplicationId
  const application = workspace.applicationsById[id]
  if (!application) return

  if (
    some(
      workspace.applicationsById,
      (app) => app.id !== id && app.repo.id === repo.id && app.name === name
    )
  ) {
    appState.editApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }

  application.repo = clone(repo)
  application.name = name
  application.releaseFilter = releaseFilter
  delete appState.editApplicationDialog
}

export const updateApplicationDialog = ({
  newOrEdit,
  update,
}: {
  newOrEdit: 'new' | 'edit'
  update: (state: ApplicationDialogState) => void
}) => {
  const dialogState =
    newOrEdit === 'new'
      ? appState.newApplicationDialog
      : appState.editApplicationDialog
  if (dialogState) {
    dialogState.warning = undefined
    update(dialogState)
  }
}

export const deleteApplication = async () => {
  if (
    !!appState.selectedApplication &&
    (await showConfirm(
      'Are you sure you want to delete ' + appState.selectedApplication.name + '?'
    ))
  ) {
    deleteActiveApplication(appState, appState.selectedApplicationId)
    delete appState.editApplicationDialog
  }
}

export const showAddEnvironmentModal = () => {
  appState.addEnvironmentDialog = {
    environmentName: '',
    workflowInputValue: '',
  }
}

export const updateEnvironmentDialog = ({
  addOrEdit,
  update,
}: {
  addOrEdit: 'add' | 'edit'
  update: (state: EnvironmentDialogState) => void
}) => {
  const dialogState =
    addOrEdit === 'add'
      ? appState.addEnvironmentDialog
      : appState.editEnvironmentDialog
  if (dialogState) {
    update(dialogState)
  }
}

export const cancelAddEnvironment = () => {
  delete appState.addEnvironmentDialog
}

export const addEnvironment = (settings: EnvironmentSettings) => {
  if (
    appState.selectedApplication &&
    appState.addEnvironmentDialog?.environmentName
  ) {
    appState.selectedApplication.environmentSettingsByName[
      appState.addEnvironmentDialog.environmentName
    ] = settings
  }
  delete appState.addEnvironmentDialog
}

export const removeEnvironment = async (name: string) => {
  if (
    appState.selectedApplication &&
    (await showConfirm(
      `Are you sure you want to delete ${appState.selectedApplication.environmentSettingsByName[name].name}?`
    ))
  ) {
    delete appState.selectedApplication.environmentSettingsByName[name]
  }
}

export const exportApplications = async () => {
  await downloadJson(
    snapshot(getActiveWorkspace(appState).applicationsById),
    'gdc-applications.json'
  )
}

export const importApplications = async () => {
  const json = await uploadJson()
  if (json) {
    const imported = JSON.parse(json)
    let applications = {}
    try {
      applications = applicationsByIdSchema.parse(imported)
    } catch (e) {
      console.error(e)
    }
    setActiveAccountApplications(appState, {
      ...snapshot(getActiveWorkspace(appState).applicationsById),
      ...applications,
    })
  }
}

export const actions = {
  addEnvironment,
  cancelAddEnvironment,
  cancelEditApplication,
  cancelEditDeployment,
  cancelNewApplication,
  createNewApplication,
  deleteApplication,
  editApplication,
  editDeployment,
  exportApplications,
  hideSettings,
  importApplications,
  removeEnvironment,
  saveApplication,
  saveDeployment,
  selectApplication,
  setAppSetting,
  setToken,
  showAddEnvironmentModal,
  showNewApplicationModal,
  showSettings,
  triggerDeployment,
  updateApplicationDialog,
  updateDeployWorkflowDialog,
  updateEnvironmentDialog,
}

export const useActions = () => actions
