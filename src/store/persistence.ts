import dayjs from 'dayjs'
import { pickBy } from 'lodash-es'
import { snapshot, subscribe } from 'valtio/vanilla'
import { z } from 'zod'
import {
  AppSettings,
  PendingDeployment,
  applicationsByIdSchema,
  appSettingsSchema,
  pendingDeploymentsSchema,
} from '../state/schemas'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './services'
import { appState } from './state'

const STORAGE_KEY = 'gdc.v2.state'

type PersistedState = {
  token?: string
  applicationsById?: typeof appState.applicationsById
  selectedApplicationId?: string
  pendingDeployments?: Record<string, PendingDeployment>
  settings?: AppSettings
}

let initialized = false

export function initializeAppStore() {
  if (initialized) return
  initialized = true

  const persistedState = loadPersistedState() ?? loadLegacyState()
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
    appState.pendingDeployments = state.pendingDeployments
  }
  if (state.settings !== undefined) {
    appState.settings = state.settings
  }
}

function savePersistedState() {
  if (typeof localStorage === 'undefined') return

  const state = snapshot(appState)
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
}

function loadPersistedState(): PersistedState | undefined {
  const data = loadJson(STORAGE_KEY)
  if (!data || typeof data !== 'object') return undefined

  return compactState({
    token:
      'token' in data && typeof data.token === 'string'
        ? data.token
        : undefined,
    applicationsById: parseValue(
      'applicationsById',
      'applicationsById' in data ? data.applicationsById : undefined,
      applicationsByIdSchema
    ),
    selectedApplicationId:
      'selectedApplicationId' in data &&
      typeof data.selectedApplicationId === 'string'
        ? data.selectedApplicationId
        : undefined,
    pendingDeployments: filterPendingDeployments(
      parseValue(
        'pendingDeployments',
        'pendingDeployments' in data ? data.pendingDeployments : undefined,
        pendingDeploymentsSchema
      )
    ),
    settings: parseValue(
      'settings',
      'settings' in data ? data.settings : undefined,
      appSettingsSchema
    ),
  })
}

function loadLegacyState(): PersistedState | undefined {
  return compactState({
    token: parseValue('gdc.token', loadJson('gdc.token'), z.string()),
    applicationsById: parseValue(
      'gdc.applicationsById',
      loadJson('gdc.applicationsById'),
      applicationsByIdSchema
    ),
    selectedApplicationId: parseValue(
      'gdc.selectedApplicationId',
      loadJson('gdc.selectedApplicationId'),
      z.string()
    ),
    pendingDeployments: filterPendingDeployments(
      parseValue(
        'gdc.pendingDeployments',
        loadJson('gdc.pendingDeployments'),
        pendingDeploymentsSchema
      )
    ),
    settings: parseValue(
      'appSettings',
      loadJson('appSettings'),
      appSettingsSchema
    ),
  })
}

function compactState(state: PersistedState): PersistedState | undefined {
  return Object.values(state).some((value) => value !== undefined)
    ? state
    : undefined
}

function filterPendingDeployments(
  pendingDeployments: Record<string, PendingDeployment> | undefined
) {
  if (!pendingDeployments) return undefined
  return pickBy(pendingDeployments, (pending) =>
    dayjs(pending.createdAt).isBefore(dayjs().add(60, 'seconds'))
  ) as Record<string, PendingDeployment>
}

function parseValue<T>(
  label: string,
  value: unknown,
  schema: z.ZodType<T>
): T | undefined {
  if (value === undefined || value === null) return undefined
  try {
    return schema.parse(value)
  } catch (error) {
    console.error(`Could not load persisted ${label}`, error)
    return undefined
  }
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
