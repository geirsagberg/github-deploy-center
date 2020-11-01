import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { OnInitialize } from 'overmind'
import { orNull } from '../utils/fp'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './effects'
import { DeploySettingsByRepoCodec, RepoCodec } from './state'

const onInitialize: OnInitialize = ({ state }, instance) => {
  const savedStateJson = localStorage.getItem('overmind')
  if (savedStateJson) {
    try {
      const savedState = JSON.parse(savedStateJson)
      state.token = savedState.token || ''
      state.selectedRepo = pipe(
        RepoCodec.decode(savedState.selectedRepo),
        orNull()
      )
      state.environmentOrderByRepo = savedState.environmentOrderByRepo || {}
      state.deploySettingsByRepo = pipe(
        DeploySettingsByRepoCodec.decode(savedState.deploySettingsByRepo),
        getOrElse((e) => {
          console.error(e)
          return {}
        })
      )
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
    (token) => {
      graphQLApi.setToken(token)
      restApi.setToken(token)
    }
  )
}

export default onInitialize
