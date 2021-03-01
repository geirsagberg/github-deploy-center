import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { OnInitialize, RootState } from 'overmind'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './effects'
import { ApplicationsByIdCodec } from './state'

const onInitialize: OnInitialize = (
  { state, effects: { storage } },
  instance
) => {
  function sync<T>(
    getState: (state: RootState) => T,
    setValue: (value: T) => void,
    options: { nested: boolean }
  ) {
    const key = getState.toString()
    instance.reaction(getState, (data) => storage.save(key, data), {
      nested: options.nested,
    })
    const value = storage.load(key)
    if (value) {
      setValue(value)
    }
  }

  sync(
    (state) => state.token,
    (token) => {
      state.token = token || ''
      graphQLApi.setToken(token)
      restApi.setToken(token)
    },
    { nested: false }
  )

  sync(
    (state) => state.applicationsById,
    (data) => {
      state.applicationsById = pipe(
        ApplicationsByIdCodec.decode(data),
        getOrElse((e) => {
          console.error(e)
          return {}
        })
      )
    },
    { nested: true }
  )

  sync(
    (state) => state.selectedApplicationId,
    (id) => (state.selectedApplicationId = id),
    { nested: false }
  )
}

export default onInitialize
