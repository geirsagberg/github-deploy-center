import type { Dayjs } from 'dayjs'
import { useSnapshot } from 'valtio'
import { proxy, type Snapshot } from 'valtio/vanilla'
import { DeploymentState } from '../generated/graphql'
import { defaultAppSettings } from '../state'
import type {
  AccountProfile,
  AppSettings,
  ApplicationConfig,
  DeploySettings,
  PendingDeployment,
  RepoModel,
} from '../state/schemas'

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
  warning?: string
}

export const createApplicationDialogState = (): ApplicationDialogState => ({
  name: '',
  releaseFilter: '',
  repo: null,
})

export type EnvironmentDialogState = {
  environmentName: string
  workflowInputValue: string
}

export type DeploymentDialogState = DeploySettings

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
