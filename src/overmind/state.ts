import { Dayjs } from 'dayjs'
import { DeploymentState } from '../generated/graphql'
import {
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
  token: string
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  selectedApplication?: ApplicationConfig
  newApplicationDialog?: ApplicationDialogState
  editApplicationDialog?: ApplicationDialogState
  addEnvironmentDialog?: EnvironmentDialogState
  editEnvironmentDialog?: EnvironmentDialogState
  deploymentDialog?: DeploymentDialogState
  settingsDialog?: SettingsDialogState
  pendingDeployments: Record<string, PendingDeployment>
}

const state: AppState = {
  token: '',
  applicationsById: {},
  selectedApplicationId: '',
  get selectedApplication() {
    return this.applicationsById[this.selectedApplicationId]
  },
  pendingDeployments: {},
}

export default state
