export interface RepoState {
  id: string
  name: string
  owner: string
}

const state = {
  token: '',
  selectedRepo: null as RepoState | null,
}

export default state
