import dayjs from 'dayjs'
import { clone } from 'lodash-es'
import {
  applicationsByIdSchema,
  createApplicationConfig,
} from '../state/schemas'
import {
  addEnvironmentSettings,
  editEnvironmentSettings,
  mergeGitHubEnvironments,
  reorderEnvironmentSettings,
} from '../state/environments'
import type {
  AccountProfile,
  AppSettings,
  ApplicationConfig,
  DeploySettings,
  EnvironmentSettings,
  GitHubEnvironment,
  RepoModel,
} from '../state/schemas'
import {
  resolveGitHubIdentity,
  type GitHubIdentityResolver,
} from '../api/githubIdentity'
import { getEnvironmentChoiceOptions } from '../api/workflowDispatch'
import { showConfirm } from '../utils/dialog'
import {
  addAccountProfile,
  deleteActiveApplication,
  findAccountByGitHubUserId,
  formatAccountName,
  getActiveWorkspace,
  getSelectedApplication,
  removeAccountProfile,
  selectActiveApplication,
  setActiveAccount,
  setActiveAccountToken,
  updateAccountProfile,
} from './accounts'
import { mergeImportedApplications } from './applicationImport'
import {
  hasApplicationWithRepoAndName,
  resolveApplicationName,
} from './applicationIdentity'
import { appState } from './state'
import { createApplicationDialogState } from './state'
import type {
  AppState,
  ApplicationDialogState,
  DeploymentDialogState,
  EnvironmentDialogState,
} from './state'
import { downloadJson, restApi, uploadJson } from './services'
import { getDeploymentId } from './utils'

export const setToken = (token: string) => {
  setActiveAccountToken(appState, token)
}

export type AddAccountInput = {
  token: string
}

export class DifferentIdentityTokenError extends Error {
  constructor({
    currentAccount,
    replacementIdentity,
  }: {
    currentAccount: AccountProfile
    replacementIdentity: { id: string; login: string }
  }) {
    super(
      `That token belongs to @${replacementIdentity.login}, not ${formatAccountName(currentAccount)}. Add it as a new account instead.`
    )
    this.name = 'DifferentIdentityTokenError'
    this.replacementIdentity = replacementIdentity
  }

  replacementIdentity: { id: string; login: string }
}

export async function addAccountToState(
  state: AppState,
  { token }: AddAccountInput,
  resolveIdentity: GitHubIdentityResolver = resolveGitHubIdentity
) {
  const normalizedToken = token.trim()

  if (!normalizedToken) {
    throw new Error('Enter a personal access token.')
  }

  let identity
  try {
    identity = await resolveIdentity(normalizedToken)
  } catch {
    throw new Error(
      'Could not validate that personal access token. Check the token and try again.'
    )
  }

  const existingAccount = findAccountByGitHubUserId(state, identity.id)
  if (existingAccount) {
    updateAccountProfile(state, existingAccount.id, {
      token: normalizedToken,
      githubLogin: identity.login,
      githubUserId: identity.id,
    })
    setActiveAccount(state, existingAccount.id)
    return existingAccount
  }

  return addAccountProfile(state, {
    token: normalizedToken,
    githubLogin: identity.login,
    githubUserId: identity.id,
  })
}

export const addAccount = (input: AddAccountInput) =>
  addAccountToState(appState, input)

export type EditAccountInput = {
  accountId: string
  token?: string
}

export async function editAccountInState(
  state: AppState,
  { accountId, token = '' }: EditAccountInput,
  resolveIdentity: GitHubIdentityResolver = resolveGitHubIdentity
) {
  const account = state.accountsById[accountId]
  if (!account) {
    throw new Error('Account not found.')
  }

  const normalizedToken = token.trim()

  if (!normalizedToken) {
    return account
  }

  let identity
  try {
    identity = await resolveIdentity(normalizedToken)
  } catch {
    throw new Error(
      'Could not validate that personal access token. Check the token and try again.'
    )
  }

  if (account.githubUserId && identity.id !== account.githubUserId) {
    throw new DifferentIdentityTokenError({
      currentAccount: account,
      replacementIdentity: identity,
    })
  }

  return updateAccountProfile(state, accountId, {
    token: normalizedToken,
    githubLogin: identity.login,
    githubUserId: identity.id,
  })
}

export const editAccount = (input: EditAccountInput) =>
  editAccountInState(appState, input)

export const selectAccount = (accountId: string) => {
  setActiveAccount(appState, accountId)
}

export async function removeAccountFromState(
  state: AppState,
  accountId: string,
  confirm: (message: string) => Promise<boolean> = showConfirm
) {
  const account = state.accountsById[accountId]
  if (!account) {
    throw new Error('Account not found.')
  }

  const applicationCount = Object.keys(
    account.workspace.applicationsById
  ).length
  const applicationNoun =
    applicationCount === 1 ? 'application' : 'applications'
  const accountName = formatAccountName(account)

  const confirmed = await confirm(
    `Remove ${accountName}? This will delete ${applicationCount} ${applicationNoun} saved in this account.`
  )
  if (!confirmed) return false

  removeAccountProfile(state, accountId)
  return true
}

export const removeAccount = (accountId: string) =>
  removeAccountFromState(appState, accountId)

export const showSettings = () => (appState.settingsDialog = {})

export const hideSettings = () => delete appState.settingsDialog

export const setAppSetting = <Key extends keyof AppSettings>(
  setting: Key,
  value: AppSettings[Key]
) => {
  appState.settings[setting] = value
}

export const showNewApplicationModal = () => {
  const selectedApplication = getSelectedApplication(appState)
  appState.newApplicationDialog = createApplicationDialogState(
    selectedApplication ? clone(selectedApplication.repo) : null
  )
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

function toPersistedDeploySettings(
  deploySettings: DeploymentDialogState,
): DeploySettings {
  const { dispatchInputs: _dispatchInputs, ...persistedDeploySettings } =
    deploySettings

  return clone(persistedDeploySettings)
}

function getDialogEnvironmentChoiceOptions(
  deploySettings: DeploymentDialogState,
) {
  return getEnvironmentChoiceOptions(
    deploySettings.dispatchInputs,
    deploySettings.environmentKey,
  )
}

export const createNewApplication = ({
  deploySettings,
  githubEnvironments,
  repo,
  name,
  releaseFilter,
}: {
  deploySettings: DeploymentDialogState
  githubEnvironments: GitHubEnvironment[]
  repo: RepoModel
  name: string
  releaseFilter: string
}) => {
  if (!appState.newApplicationDialog) return
  const workspace = getActiveWorkspace(appState)
  const applicationName = resolveApplicationName({ name, repo })
  if (hasApplicationWithRepoAndName({
    applicationsById: workspace.applicationsById,
    name: applicationName,
    repo,
  })) {
    appState.newApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }
  const appConfig = createApplicationConfig(
    clone(repo),
    applicationName,
    releaseFilter
  )
  appConfig.deploySettings = toPersistedDeploySettings(deploySettings)
  appConfig.environmentSettingsByName = mergeGitHubEnvironments(
    appConfig.environmentSettingsByName,
    githubEnvironments,
    getDialogEnvironmentChoiceOptions(deploySettings),
  )
  workspace.applicationsById[appConfig.id] = appConfig
  workspace.selectedApplicationId = appConfig.id
  delete appState.newApplicationDialog
}

export const cancelNewApplication = () => {
  delete appState.newApplicationDialog
}

export const selectApplication = (id: string) => {
  selectActiveApplication(appState, id)
}

export const editApplication = () => {
  if (appState.selectedApplication) {
    appState.editApplicationDialog = createApplicationDialogState(
      clone(appState.selectedApplication.repo),
      clone(appState.selectedApplication.deploySettings)
    )
    appState.editApplicationDialog.name = appState.selectedApplication.name
    appState.editApplicationDialog.releaseFilter =
      appState.selectedApplication.releaseFilter
  } else {
    appState.editApplicationDialog = createApplicationDialogState()
  }
}

export const editDeployment = () => {
  editApplication()
}

export const saveDeployment = (githubEnvironments: GitHubEnvironment[] = []) => {
  if (appState.selectedApplication && appState.deploymentDialog) {
    const environmentChoices = getDialogEnvironmentChoiceOptions(
      appState.deploymentDialog,
    )

    appState.selectedApplication.deploySettings = toPersistedDeploySettings(
      appState.deploymentDialog,
    )
    appState.selectedApplication.environmentSettingsByName =
      mergeGitHubEnvironments(
        appState.selectedApplication.environmentSettingsByName,
        githubEnvironments,
        environmentChoices,
      )
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
  deploySettings,
  githubEnvironments,
  repo,
  name,
  releaseFilter,
}: {
  deploySettings: DeploymentDialogState
  githubEnvironments: GitHubEnvironment[]
  repo: RepoModel
  name: string
  releaseFilter: string
}) => {
  if (!appState.editApplicationDialog) return
  const workspace = getActiveWorkspace(appState)
  const id = workspace.selectedApplicationId
  const application = workspace.applicationsById[id]
  if (!application) return
  const applicationName = resolveApplicationName({ name, repo })

  if (hasApplicationWithRepoAndName({
    applicationsById: workspace.applicationsById,
    excludeApplicationId: id,
    name: applicationName,
    repo,
  })) {
    appState.editApplicationDialog.warning =
      'App with same name and repo already exists!'
    return
  }

  application.repo = clone(repo)
  application.name = applicationName
  application.deploySettings = toPersistedDeploySettings(deploySettings)
  application.environmentSettingsByName = mergeGitHubEnvironments(
    application.environmentSettingsByName,
    githubEnvironments,
    getDialogEnvironmentChoiceOptions(deploySettings),
  )
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
    workflowInputValueTouched: false,
  }
}

export const showEditEnvironmentModal = (name: string) => {
  const environmentSettings =
    appState.selectedApplication?.environmentSettingsByName[name]

  if (!environmentSettings) return

  appState.editEnvironmentDialog = {
    environmentName: environmentSettings.name,
    workflowInputValue: environmentSettings.workflowInputValue,
    originalEnvironmentName: name,
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

export const cancelEditEnvironment = () => {
  delete appState.editEnvironmentDialog
}

export const addEnvironment = (settings: EnvironmentSettings) => {
  if (
    appState.selectedApplication &&
    appState.addEnvironmentDialog?.environmentName
  ) {
    appState.selectedApplication.environmentSettingsByName =
      addEnvironmentSettings(
        appState.selectedApplication.environmentSettingsByName,
        settings,
      )
  }
  delete appState.addEnvironmentDialog
}

export const editEnvironment = (settings: EnvironmentSettings) => {
  const originalName = appState.editEnvironmentDialog?.originalEnvironmentName

  if (appState.selectedApplication && originalName) {
    appState.selectedApplication.environmentSettingsByName =
      editEnvironmentSettings(
        appState.selectedApplication.environmentSettingsByName,
        originalName,
        settings,
      )
  }
  delete appState.editEnvironmentDialog
}

export const reorderEnvironment = ({
  draggedName,
  targetName,
}: {
  draggedName: string
  targetName: string
}) => {
  if (!appState.selectedApplication) return

  appState.selectedApplication.environmentSettingsByName =
    reorderEnvironmentSettings(
      appState.selectedApplication.environmentSettingsByName,
      draggedName,
      targetName,
    )
}

export const removeEnvironment = async (name: string) => {
  const environmentSettings =
    appState.selectedApplication?.environmentSettingsByName[name]

  if (!appState.selectedApplication || !environmentSettings) return

  if (
    await showConfirm(
      `Are you sure you want to delete ${environmentSettings.name}?`
    )
  ) {
    delete appState.selectedApplication.environmentSettingsByName[name]
    if (appState.editEnvironmentDialog?.originalEnvironmentName === name) {
      delete appState.editEnvironmentDialog
    }
  }
}

export const exportApplicationsFromState = async (
  state: AppState,
  download: typeof downloadJson = downloadJson
) => {
  await download(
    { ...getActiveWorkspace(state).applicationsById },
    'gdc-applications.json'
  )
}

export const exportApplications = async () => {
  await exportApplicationsFromState(appState)
}

export const importApplicationsToState = async (
  state: AppState,
  upload: typeof uploadJson = uploadJson
) => {
  const json = await upload()
  if (json) {
    let applications: Record<string, ApplicationConfig> = {}
    try {
      const imported = JSON.parse(json)
      applications = applicationsByIdSchema.parse(imported)
    } catch (error) {
      console.error('Could not import applications JSON', error)
      return
    }
    const workspace = getActiveWorkspace(state)
    const merged = mergeImportedApplications(
      { ...workspace.applicationsById },
      workspace.selectedApplicationId,
      applications
    )
    workspace.applicationsById = merged.applicationsById
    workspace.selectedApplicationId = merged.selectedApplicationId
  }
}

export const importApplications = async () => {
  await importApplicationsToState(appState)
}

export const actions = {
  addAccount,
  addEnvironment,
  cancelAddEnvironment,
  cancelEditEnvironment,
  cancelEditApplication,
  cancelEditDeployment,
  cancelNewApplication,
  createNewApplication,
  deleteApplication,
  editApplication,
  editAccount,
  editDeployment,
  editEnvironment,
  exportApplications,
  hideSettings,
  importApplications,
  reorderEnvironment,
  removeAccount,
  removeEnvironment,
  saveApplication,
  saveDeployment,
  selectAccount,
  selectApplication,
  setAppSetting,
  setToken,
  showAddEnvironmentModal,
  showEditEnvironmentModal,
  showNewApplicationModal,
  showSettings,
  triggerDeployment,
  updateApplicationDialog,
  updateDeployWorkflowDialog,
  updateEnvironmentDialog,
}

export const useActions = () => actions
