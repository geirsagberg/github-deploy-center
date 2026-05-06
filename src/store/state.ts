import type { Dayjs } from 'dayjs'
import { useSnapshot } from 'valtio'
import { proxy, type Snapshot } from 'valtio/vanilla'
import { DeploymentState } from '../generated/graphql'
import { defaultAppSettings } from '../state'
import type { DeploymentDialogState } from '../state/deployWorkflow'
import type { EnvironmentMappingSuggestion } from '../state/environments'
import type {
  AccountProfile,
  AppSettings,
  ApplicationConfig,
  PendingDeployment,
  RepoModel,
} from '../state/schemas'
import { createDeploySettings } from '../state/schemas'

export type { DeploymentDialogState } from '../state/deployWorkflow'

export interface ReleaseModel {
  id: string
  name: string
  tagName: string
  createdAt: Dayjs
  commit: string
  deployments: DeploymentModel[]
}

export interface DeploymentModel {
  id: string
  databaseId?: number
  createdAt: Dayjs
  environment: string
  state: DeploymentState
  modifiedAt?: Dayjs
  workflowRunId?: number
}

export type ApplicationDialogState = {
  repo: RepoModel | null
  name: string
  releaseFilter: string
  deploySettings: DeploymentDialogState
  warning?: string
}

export const createApplicationDialogState = (
  repo: RepoModel | null = null,
  deploySettings = createDeploySettings({ ref: repo?.defaultBranch ?? '' })
): ApplicationDialogState => ({
  name: repo?.name ?? '',
  releaseFilter: '',
  repo,
  deploySettings,
})

export type EnvironmentDialogState = {
  environmentName: string
  workflowInputValue: string
  workflowInputValueTouched?: boolean
  originalEnvironmentName?: string
}

export type EnvironmentMappingDialogState = {
  applicationId: string
  applicationName: string
  mappings: EnvironmentMappingSuggestion[]
}

export type SettingsDialogState = {}

export type AppState = {
  accountsById: Record<string, AccountProfile>
  activeAccountId: string
  readonly activeAccount?: AccountProfile
  readonly token: string
  readonly applicationsById: Record<string, ApplicationConfig>
  readonly selectedApplicationId: string
  readonly selectedApplication?: ApplicationConfig
  newApplicationDialog?: ApplicationDialogState
  editApplicationDialog?: ApplicationDialogState
  environmentMappingDialog?: EnvironmentMappingDialogState
  addEnvironmentDialog?: EnvironmentDialogState
  editEnvironmentDialog?: EnvironmentDialogState
  deploymentDialog?: DeploymentDialogState
  settingsDialog?: SettingsDialogState
  readonly pendingDeployments: Record<string, PendingDeployment>
  settings: AppSettings
}

export const createInitialAppState = (): AppState => ({
  accountsById: {},
  activeAccountId: '',
  get activeAccount() {
    return this.accountsById[this.activeAccountId]
  },
  get token() {
    return this.activeAccount?.token ?? ''
  },
  get applicationsById() {
    return this.activeAccount?.workspace.applicationsById ?? {}
  },
  get selectedApplicationId() {
    return this.activeAccount?.workspace.selectedApplicationId ?? ''
  },
  get selectedApplication() {
    const workspace = this.activeAccount?.workspace
    if (!workspace) return undefined

    return workspace.applicationsById[workspace.selectedApplicationId]
  },
  get pendingDeployments() {
    return this.activeAccount?.workspace.pendingDeployments ?? {}
  },
  settings: { ...defaultAppSettings },
})

export const appState = proxy<AppState>(createInitialAppState())

export type AppSnapshot = Snapshot<AppState>

export const useAppState = () => useSnapshot(appState)
