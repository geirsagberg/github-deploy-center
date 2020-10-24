import { Action } from 'overmind'
import { RepoState } from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const setSelectedRepo: Action<RepoState | null> = ({ state }, repo) => {
  state.selectedRepo = repo
}
