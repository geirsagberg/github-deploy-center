import { Dayjs } from 'dayjs'
import * as t from 'io-ts'
import { v4 as uuid } from 'uuid'
import { DeploymentState } from '../generated/graphql'

export const RepoCodec = t.type({
  id: t.string,
  name: t.string,
  owner: t.string,
  defaultBranch: t.string,
})

export type RepoModel = t.TypeOf<typeof RepoCodec>

export type ReleaseModel = {
  id: string
  name: string
  tagName: string
  createdAt: Dayjs
  commit: string
  deployments: DeploymentModel[]
}

export type DeploymentModel = {
  id: string
  createdAt: Dayjs
  environment: string
  state: DeploymentState
}

export const DeployWorkflowCodec = t.type({
  type: t.literal('workflow'),
  workflowId: t.number,
  releaseKey: t.string,
  environmentKey: t.string,
  ref: t.string,
  extraArgs: t.record(t.string, t.string),
})

export type DeployWorkflowSettings = t.TypeOf<typeof DeployWorkflowCodec>

export const createDeployWorkflowSettings = ({
  workflowId = 0,
  ref,
}: {
  workflowId?: number
  ref: string
}): DeployWorkflowSettings => ({
  type: 'workflow',
  environmentKey: 'environment',
  releaseKey: 'ref',
  workflowId,
  ref,
  extraArgs: {},
})

export const DeployDeploymentCodec = t.type({
  type: t.literal('deployment'),
})

export const DeploySettingsCodec = t.union([
  DeployWorkflowCodec,
  DeployDeploymentCodec,
])

export const GitHubEnvironmentCodec = t.type({
  id: t.number,
  name: t.string,
})

export type GitHubEnvironment = t.TypeOf<typeof GitHubEnvironmentCodec>

export const EnvironmentSettingsCodec = t.intersection([
  GitHubEnvironmentCodec,
  t.type({
    workflowInputValue: t.string,
  }),
])

export type EnvironmentSettings = t.TypeOf<typeof EnvironmentSettingsCodec>

export const ApplicationConfigCodec = t.type({
  id: t.string,
  name: t.string,
  releaseFilter: t.string,
  environmentSettingsById: t.record(t.string, EnvironmentSettingsCodec),
  repo: RepoCodec,
  deploySettings: DeploySettingsCodec,
})

export const createApplicationConfig = (
  repo: RepoModel,
  name: string,
  releaseFilter: string
): ApplicationConfig => ({
  id: uuid(),
  name: name || repo.name,
  releaseFilter,
  environmentSettingsById: {},
  repo,
  deploySettings: createDeployWorkflowSettings({ ref: repo.defaultBranch }),
})

export type ApplicationConfig = t.TypeOf<typeof ApplicationConfigCodec>

export const ApplicationsByIdCodec = t.record(t.string, ApplicationConfigCodec)

export const DeploySettingsByRepoCodec = t.record(t.string, DeploySettingsCodec)

export type DeploySettings = t.TypeOf<typeof DeploySettingsCodec>

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
  environmentId: number | null
  workflowInputValue: string
}

export type DeploymentDialogState = DeployWorkflowSettings

export type AppState = {
  token: string
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  selectedApplication: ApplicationConfig | null
  newApplicationDialog: ApplicationDialogState | null
  editApplicationDialog: ApplicationDialogState | null
  addEnvironmentDialog: EnvironmentDialogState | null
  editEnvironmentDialog: EnvironmentDialogState | null
  deploymentDialog: DeploymentDialogState | null
}

const state: AppState = {
  token: '',
  applicationsById: {},
  selectedApplicationId: '',
  get selectedApplication() {
    return this.applicationsById[this.selectedApplicationId] ?? null
  },
  newApplicationDialog: null,
  editApplicationDialog: null,
  addEnvironmentDialog: null,
  editEnvironmentDialog: null,
  deploymentDialog: null,
}

export default state
