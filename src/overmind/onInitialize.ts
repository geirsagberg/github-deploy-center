import { OnInitialize } from 'overmind'
import graphQLApi from '../utils/graphQLApi'

const onInitialize: OnInitialize = ({ state }, instance) => {
  const savedStateJson = localStorage.getItem('overmind')
  if (savedStateJson) {
    try {
      const savedState = JSON.parse(savedStateJson)
      state.token = savedState.token || ''
      state.selectedRepo = savedState.selectedRepo || null
      state.environmentOrderByRepo = savedState.environmentOrderByRepo || {}
      state.deploySettingsByRepo = savedState.deploySettingsByRepo || {}
    } catch (error) {
      console.error(error)
    }
  }
  instance.reaction(
    ({
      token,
      selectedRepo,
      environmentOrderByRepo,
      deploySettingsByRepo,
    }) => ({
      token,
      selectedRepo,
      environmentOrderByRepo,
      deploySettingsByRepo,
    }),
    (data) => localStorage.setItem('overmind', JSON.stringify(data))
  )
  instance.reaction(
    ({ token }) => token,
    (token) => graphQLApi.setToken(token)
  )
}

export default onInitialize
