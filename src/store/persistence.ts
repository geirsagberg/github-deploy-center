import dayjs from 'dayjs'
import { pickBy } from 'lodash-es'
import { snapshot, subscribe } from 'valtio/vanilla'
import type { AccountProfile, PendingDeployment } from '../state/schemas'
import graphQLApi from '../utils/graphQLApi'
import { restApi } from './services'
import { appState } from './state'
import { parsePersistedState } from './persistedState'
import type { PersistedState } from './persistedState'

const STORAGE_KEY = 'gdc.v2.state'

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
  appState.accountsById = filterAccountsPendingDeployments(state.accountsById)
  appState.activeAccountId = state.activeAccountId

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
        accountsById: state.accountsById,
        activeAccountId: state.activeAccountId,
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
    return parsePersistedState(data)
  } catch (error) {
    console.error(`Could not load ${STORAGE_KEY}`, error)
    return undefined
  }
}

function filterAccountsPendingDeployments(
  accountsById: Record<string, AccountProfile>
) {
  return Object.fromEntries(
    Object.entries(accountsById).map(([id, account]) => [
      id,
      {
        ...account,
        workspace: {
          ...account.workspace,
          pendingDeployments: filterPendingDeployments(
            account.workspace.pendingDeployments
          ),
        },
      },
    ])
  )
}

function filterPendingDeployments(
  pendingDeployments: Record<string, PendingDeployment>
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
