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
}

export type DeploymentModel = {
  id: string
  createdAt: Dayjs
  environment: string
  refName: string
  state: DeploymentState
  commit: string
}

export const DeployWorkflowCodec = t.type({
  type: t.literal('workflow'),
  workflowId: t.number,
  releaseKey: t.string,
  environmentKey: t.string,
  ref: t.string,
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
})

export const DeployDeploymentCodec = t.type({
  type: t.literal('deployment'),
})

export const DeploySettingsCodec = t.union([
  DeployWorkflowCodec,
  DeployDeploymentCodec,
])

export const ApplicationConfigCodec = t.type({
  id: t.string,
  name: t.string,
  releasePrefix: t.string,
  environmentIds: t.array(t.string),
  repo: RepoCodec,
  deploySettings: DeploySettingsCodec,
})

export const createApplicationConfig = (
  repo: RepoModel,
  name: string
): ApplicationConfig => ({
  id: uuid(),
  name: name || repo.name,
  releasePrefix: '',
  environmentIds: [],
  repo,
  deploySettings: createDeployWorkflowSettings({ ref: repo.defaultBranch }),
})

export type ApplicationConfig = t.TypeOf<typeof ApplicationConfigCodec>

export const ApplicationsByIdCodec = t.record(t.string, ApplicationConfigCodec)

export const DeploySettingsByRepoCodec = t.record(t.string, DeploySettingsCodec)

export type DeploySettings = t.TypeOf<typeof DeploySettingsCodec>

export type ApplicationDialogState = {
  open: boolean
  repoId: string
  name: string
  warning?: string
}

export type AppState = {
  token: string
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  selectedApplication: ApplicationConfig | null
  newApplicationDialog: ApplicationDialogState
  editApplicationDialog: ApplicationDialogState
}

const state: AppState = {
  token: '',
  applicationsById: {},
  selectedApplicationId: '',
  get selectedApplication() {
    return this.applicationsById[this.selectedApplicationId] ?? null
  },
  newApplicationDialog: { open: false, repoId: '', name: '' },
  editApplicationDialog: { open: false, repoId: '', name: '' },
}

export default state
