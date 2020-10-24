import { Action } from 'overmind'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}
