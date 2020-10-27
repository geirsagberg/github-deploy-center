import { Dayjs } from 'dayjs'
import { DeploymentState } from '../generated/graphql'

export type RepoModel = {
  id: string
  name: string
  owner: string
}

export type ReleaseModel = {
  id: string
  name: string
  tagName: string
  createdAt: Dayjs
}

export type DeploymentModel = {
  id: string
  createdAt: Dayjs
  environment: string
  refName: string
  state: DeploymentState
}

export type DeployAction = {
  workflowId: string
  inputs: [string, string][]
}

export type DeploySettings = {
  type: 'action' | 'webhook' | 'deployment'
  action: DeployAction
}

export type AppState = {
  token: string
  selectedRepo: RepoModel | null
  selectedRepoId: string | null
  environmentOrderByRepo: Record<string, string[]>
  environmentOrderForSelectedRepo: string[] | null
  deploySettingsByRepo: Record<string, DeploySettings>
  deploySettingsForSelectedRepo: DeploySettings
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
  get deploySettingsForSelectedRepo(): DeploySettings {
    return (
      (this.selectedRepoId &&
        this.deploySettingsByRepo[this.selectedRepoId]) || {
        type: 'action',
        action: {
          inputs: [],
          workflowId: '',
        },
      }
    )
  },
}

export default state
