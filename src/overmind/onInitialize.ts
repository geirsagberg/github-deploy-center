import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { noop } from 'lodash-es'
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
    onValueLoaded: (value: T) => void,
    options: { nested: boolean },
    onValueChanged: (value: T) => void = noop
  ) {
    const key = getState.toString().replace(/^.*\./, 'gdc.')
    instance.reaction(
      getState,
      (data) => {
        onValueChanged(data)
        storage.save(key, data)
      },
      {
        nested: options.nested,
      }
    )
    const value = storage.load(key)
    if (value) {
      onValueLoaded(value)
    }
  }

  sync(
    (state) => state.token,
    (token) => {
      state.token = token || ''
    },
    { nested: false },
    (token) => {
      graphQLApi.setToken(token)
      restApi.setToken(token)
    }
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
