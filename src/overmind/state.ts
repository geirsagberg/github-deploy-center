import { Dayjs } from 'dayjs'
import { derived } from 'overmind'
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

export type AppState = {
  token: string
  selectedRepo: RepoModel | null
  environmentOrderByRepo: Record<string, string[]>
  environmentOrderForSelectedRepo: string[] | null
}

const state: AppState = {
  token: '',
  selectedRepo: null as RepoModel | null,
  environmentOrderByRepo: {} as Record<string, string[]>,
  environmentOrderForSelectedRepo: derived(
    (root: AppState) =>
      (root.selectedRepo &&
        root.environmentOrderByRepo[root.selectedRepo.id]) ||
      null
  ),
}

export default state
