import { Dayjs } from 'dayjs'
import * as t from 'io-ts'
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
  releaseKey: 'release',
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

export const DeploySettingsByRepoCodec = t.record(t.string, DeploySettingsCodec)

type DeploySettings = t.TypeOf<typeof DeploySettingsCodec>

export type AppState = {
  token: string
  selectedRepo: RepoModel | null
  selectedRepoId: string | null
  environmentOrderByRepo: Record<string, string[]>
  environmentOrderForSelectedRepo: Readonly<string[]> | null
  deploySettingsByRepo: Record<string, DeploySettings>
  deploySettingsForSelectedRepo: Readonly<DeploySettings | null>
}

const state: AppState = {
  token: '',
  selectedRepo: null,
  get selectedRepoId() {
    return this.selectedRepo ? this.selectedRepo.id : null
  },
  environmentOrderByRepo: {},
  get environmentOrderForSelectedRepo() {
    return (
      (this.selectedRepoId &&
        this.environmentOrderByRepo[this.selectedRepoId]) ||
      null
    )
  },
  deploySettingsByRepo: {},
  get deploySettingsForSelectedRepo() {
    return this.selectedRepo
      ? this.deploySettingsByRepo[this.selectedRepo.id] ??
          createDeployWorkflowSettings({ ref: this.selectedRepo.defaultBranch })
      : null
  },
}

export default state
