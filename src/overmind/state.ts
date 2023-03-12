import { Dayjs } from 'dayjs'
import * as t from 'io-ts'
import { keyBy, map } from 'lodash-es'
import { v4 as uuid } from 'uuid'
import { DeploymentState } from '../generated/graphql'

export const RepoCodec = t.type({
  id: t.string,
  name: t.string,
  owner: t.string,
  defaultBranch: t.string,
})

export interface RepoModel extends t.TypeOf<typeof RepoCodec> {}

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

export const DeployWorkflowCodec = t.type({
  type: t.literal('workflow'),
  workflowId: t.number,
  releaseKey: t.string,
  environmentKey: t.string,
  ref: t.string,
  extraArgs: t.record(t.string, t.string),
})

export interface DeployWorkflowSettings
  extends t.TypeOf<typeof DeployWorkflowCodec> {}

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

export const WorkflowRunCodec = t.strict({
  id: t.number,
  name: t.string,
  status: t.string,
  created_at: t.string,
  conclusion: t.union([t.string, t.null]),
  run_number: t.number,
  html_url: t.string,
})

export interface WorkflowRun extends t.TypeOf<typeof WorkflowRunCodec> {}

export const WorkflowRunsCodec = t.array(WorkflowRunCodec)

export const GitHubEnvironmentCodec = t.strict({
  name: t.string,
})

export const GitHubEnvironmentsCodec = t.array(GitHubEnvironmentCodec)

export interface GitHubEnvironment
  extends t.TypeOf<typeof GitHubEnvironmentCodec> {}

export const EnvironmentSettingsCodec = t.strict({
  name: t.string,
  workflowInputValue: t.string,
})

export interface EnvironmentSettings
  extends t.TypeOf<typeof EnvironmentSettingsCodec> {}

type HasEnvironmentSettings = {
  environmentSettingsByName: {
    [name: string]: EnvironmentSettings
  }
}

const EnvironmentSettingsByNameCodec = t.type({
  environmentSettingsByName: t.record(t.string, EnvironmentSettingsCodec),
})

// TODO: Remove handling environmentSettingsById after a while
export const ApplicationConfigCodec = t.intersection([
  t.strict({
    id: t.string,
    name: t.string,
    releaseFilter: t.string,
    repo: RepoCodec,
    deploySettings: DeploySettingsCodec,
  }),
  t.exact(
    new t.InterfaceType<HasEnvironmentSettings, HasEnvironmentSettings>(
      'HasEnvironmentSettings',
      (x: any): x is HasEnvironmentSettings => 'environmentSettingsByName' in x,
      (input: any, context) => {
        if (input.environmentSettingsByName)
          return EnvironmentSettingsByNameCodec.validate(input, context)
        if (input.environmentSettingsById) {
          return t.success({
            environmentSettingsByName: keyBy(
              map(
                input.environmentSettingsById,
                (settings): EnvironmentSettings => ({
                  name: settings.name,
                  workflowInputValue: settings.workflowInputValue,
                })
              ),
              (x) => x.name
            ),
          })
        }
        return t.failure(input, context)
      },
      t.identity,
      {
        environmentSettingsByName: {},
      }
    )
  ),
])

export const createApplicationConfig = (
  repo: RepoModel,
  name: string,
  releaseFilter: string
): ApplicationConfig => ({
  id: uuid(),
  name: name || repo.name,
  releaseFilter,
  environmentSettingsByName: {},
  repo,
  deploySettings: createDeployWorkflowSettings({ ref: repo.defaultBranch }),
})

export type ApplicationConfig = t.TypeOf<typeof ApplicationConfigCodec>

export const ApplicationsByIdCodec = t.record(t.string, ApplicationConfigCodec)

export const DeploySettingsByRepoCodec = t.record(t.string, DeploySettingsCodec)

export const AppSettingsCodec = t.type({
  deployTimeoutSecs: t.number,
  refreshIntervalSecs: t.number,
})

export type AppSettings = t.TypeOf<typeof AppSettingsCodec>

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
  environmentName: string
  workflowInputValue: string
}

export type DeploymentDialogState = DeployWorkflowSettings

export type SettingsDialogState = {}

export const PendingDeploymentCodec = t.intersection([
  t.type({
    createdAt: t.string,
  }),
  t.partial({
    workflowRunId: t.number,
  }),
])

export interface PendingDeployment
  extends t.TypeOf<typeof PendingDeploymentCodec> {}

export const PendingDeploymentsCodec = t.record(
  t.string,
  PendingDeploymentCodec
)

export type AppState = {
  token: string
  appSettings: AppSettings
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

export const defaultAppSettings: AppSettings = {
  deployTimeoutSecs: 60,
  refreshIntervalSecs: 60,
}

const state: AppState = {
  token: '',
  appSettings: defaultAppSettings,
  applicationsById: {},
  selectedApplicationId: '',
  get selectedApplication() {
    return this.applicationsById[this.selectedApplicationId]
  },
  pendingDeployments: {},
}

export default state
