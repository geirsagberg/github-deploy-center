import dayjs from 'dayjs'
import { getOrElse } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { noop, pickBy } from 'lodash-es'
import { Context } from '.'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './effects'
import {
  ApplicationsByIdCodec,
  AppSettingsCodec,
  AppState,
  defaultAppSettings,
  PendingDeployment,
  PendingDeploymentsCodec,
} from './state'

export const onInitializeOvermind = ({
  state,
  effects: { storage },
  reaction,
}: Context) => {
  function sync<T>(
    getState: (state: AppState) => T,
    onValueLoaded: (value: T) => void,
    options: { nested: boolean },
    onValueChanged: (value: T) => void = noop
  ) {
    const key = getState.toString().replace(/^.*?\./, 'gdc.')
    reaction(
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

  sync(
    (state) => state.appSettings,
    (data) => {
      state.appSettings = pipe(
        AppSettingsCodec.decode(data),
        getOrElse((e) => {
          console.error(e)
          return defaultAppSettings
        })
      )
    },
    { nested: true }
  )

  sync(
    (state) => state.pendingDeployments,
    (data) => {
      state.pendingDeployments = pipe(
        PendingDeploymentsCodec.decode(data),
        getOrElse((e) => {
          console.error(e)
          return {} as Record<string, PendingDeployment>
        }),
        (data) =>
          pickBy(data, (pending) =>
            dayjs(pending.createdAt).isBefore(
              dayjs().add(state.appSettings.deployTimeoutSecs, 'seconds')
            )
          )
      )
    },
    { nested: true }
  )
}
