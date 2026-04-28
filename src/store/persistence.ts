import dayjs from 'dayjs'
import { pickBy } from 'lodash-es'
import { snapshot, subscribe } from 'valtio/vanilla'
import { z } from 'zod'
import {
  applicationsByIdSchema,
  appSettingsSchema,
  pendingDeploymentsSchema,
} from '../state/schemas'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './services'
import { appState } from './state'

const STORAGE_KEY = 'gdc.v2.state'

const persistedStateSchema = z.object({
  token: z.string().optional(),
  applicationsById: applicationsByIdSchema.optional(),
  selectedApplicationId: z.string().optional(),
  pendingDeployments: pendingDeploymentsSchema.optional(),
  settings: appSettingsSchema.optional(),
})

type PersistedState = z.infer<typeof persistedStateSchema>

let initialized = false

export function initializeAppStore() {
  if (initialized) return
  initialized = true

  const persistedState = loadPersistedState()
  if (persistedState) {
    applyPersistedState(persistedState)
  }

  syncToken(appState.token)
  let lastToken = appState.token

  subscribe(appState, () => {
    if (appState.token !== lastToken) {
      lastToken = appState.token
      syncToken(lastToken)
    }
    savePersistedState()
  })
}

function syncToken(token: string) {
  graphQLApi.setToken(token)
  restApi.setToken(token)
}

function applyPersistedState(state: PersistedState) {
  if (state.token !== undefined) {
    appState.token = state.token
  }
  if (state.applicationsById !== undefined) {
    appState.applicationsById = state.applicationsById
  }
  if (state.selectedApplicationId !== undefined) {
    appState.selectedApplicationId = state.selectedApplicationId
  }
  if (state.pendingDeployments !== undefined) {
    appState.pendingDeployments = filterPendingDeployments(
      state.pendingDeployments
    )
  }
  if (state.settings !== undefined) {
    appState.settings = state.settings
  }
}

function savePersistedState() {
  if (typeof localStorage === 'undefined') return

  const state = snapshot(appState)
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: state.token,
        applicationsById: state.applicationsById,
        selectedApplicationId: state.selectedApplicationId,
        pendingDeployments: state.pendingDeployments,
        settings: state.settings,
      })
    )
  } catch (error) {
    console.error(`Could not save ${STORAGE_KEY}`, error)
  }
}

function loadPersistedState(): PersistedState | undefined {
  const data = loadJson(STORAGE_KEY)
  if (data === undefined) return undefined

  try {
    return persistedStateSchema.parse(data)
  } catch (error) {
    console.error(`Could not load ${STORAGE_KEY}`, error)
    return undefined
  }
}

function filterPendingDeployments(
  pendingDeployments: PersistedState['pendingDeployments']
) {
  return pickBy(pendingDeployments, (pending) =>
    dayjs(pending.createdAt).isBefore(dayjs().add(60, 'seconds'))
  )
}

function loadJson(key: string): unknown {
  if (typeof localStorage === 'undefined') return undefined

  const value = localStorage.getItem(key)
  if (!value) return undefined

  try {
    return JSON.parse(value)
  } catch (error) {
    console.error(`Could not parse localStorage item ${key}`, error)
    return undefined
  }
}
