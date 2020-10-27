import { Action } from 'overmind'
import { RepoModel } from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const setSelectedRepo: Action<RepoModel | null> = ({ state }, repo) => {
  state.selectedRepo = repo
}
