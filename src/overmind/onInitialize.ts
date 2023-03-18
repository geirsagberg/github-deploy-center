import dayjs from 'dayjs'
import { noop, pickBy } from 'lodash-es'
import { Context } from '.'
import {
  applicationsByIdSchema,
  pendingDeploymentsSchema,
} from '../state/schemas'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './effects'
import { AppState } from './state'

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
      try {
        state.applicationsById = applicationsByIdSchema.parse(data)
      } catch (error) {
        console.error(error)
      }
    },
    { nested: true }
  )

  sync(
    (state) => state.selectedApplicationId,
    (id) => (state.selectedApplicationId = id),
    { nested: false }
  )

  sync(
    (state) => state.pendingDeployments,
    (data) => {
      try {
        state.pendingDeployments = pickBy(
          pendingDeploymentsSchema.parse(data),
          (pending) =>
            // TODO: Move pending deployments to Recoil
            dayjs(pending.createdAt).isBefore(dayjs().add(60, 'seconds'))
        )
      } catch (error) {
        console.error(error)
      }
    },
    { nested: true }
  )
}
