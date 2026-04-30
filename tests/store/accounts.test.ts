import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_ACCOUNT_ID,
  getActiveAccount,
  getActiveWorkspace,
  selectActiveApplication,
  setActiveAccountApplications,
  setActiveAccountToken,
} from '../../src/store/accounts'
import { MIGRATED_ACCOUNT_ID } from '../../src/store/legacyMigration'
import { parsePersistedState } from '../../src/store/persistedState'
import { createInitialAppState } from '../../src/store/state'
import type { ApplicationConfig } from '../../src/state/schemas'

const appConfig = (id: string, name = id): ApplicationConfig => ({
  id,
  name,
  releaseFilter: '',
  repo: {
    id: `repo-${id}`,
    owner: 'octo',
    name: `repo-${id}`,
    defaultBranch: 'main',
  },
  deploySettings: {
    type: 'workflow',
    environmentKey: 'environment',
    releaseKey: 'ref',
    workflowId: 1,
    ref: 'main',
    extraArgs: {},
  },
  environmentSettingsByName: {},
})

describe('persisted account migration', () => {
  test('migrates legacy state into exactly one active account', () => {
    const app = appConfig('app-1')
    const migrated = parsePersistedState({
      token: 'ghp_legacy',
      applicationsById: { [app.id]: app },
      selectedApplicationId: app.id,
      pendingDeployments: {
        deployment: { createdAt: '2026-04-30T12:00:00.000Z' },
      },
      settings: {
        deployTimeoutSecs: 30,
        refreshIntervalSecs: 15,
        workflowRuns: 50,
      },
    })

    expect(migrated?.activeAccountId).toBe(MIGRATED_ACCOUNT_ID)
    expect(Object.keys(migrated?.accountsById ?? {})).toEqual([
      MIGRATED_ACCOUNT_ID,
    ])
    expect(migrated?.accountsById[MIGRATED_ACCOUNT_ID].token).toBe(
      'ghp_legacy'
    )
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace.applicationsById
    ).toEqual({ [app.id]: app })
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace
        .selectedApplicationId
    ).toBe(app.id)
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace.pendingDeployments
        .deployment
    ).toEqual({ createdAt: '2026-04-30T12:00:00.000Z' })
    expect(migrated?.settings?.workflowRuns).toBe(50)
  })

  test('preserves legacy applications even when the token is missing', () => {
    const app = appConfig('app-1')
    const migrated = parsePersistedState({
      applicationsById: { [app.id]: app },
    })

    expect(migrated?.activeAccountId).toBe(MIGRATED_ACCOUNT_ID)
    expect(migrated?.accountsById[MIGRATED_ACCOUNT_ID].token).toBe('')
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace.applicationsById
    ).toEqual({ [app.id]: app })
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace
        .selectedApplicationId
    ).toBe(app.id)
  })

  test('creates an empty active account when a legacy token has no applications', () => {
    const migrated = parsePersistedState({ token: 'ghp_legacy' })

    expect(migrated?.activeAccountId).toBe(MIGRATED_ACCOUNT_ID)
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace.applicationsById
    ).toEqual({})
    expect(
      migrated?.accountsById[MIGRATED_ACCOUNT_ID].workspace
        .selectedApplicationId
    ).toBe('')
  })

  test('ignores malformed persisted state without throwing', () => {
    expect(parsePersistedState({ token: 42 })).toBeUndefined()
  })

  test('recovers valid account-shaped state while dropping invalid accounts', () => {
    const app = appConfig('app-1')
    const migrated = parsePersistedState({
      accountsById: {
        valid: {
          id: 'stale-id',
          token: 'ghp_valid',
          workspace: {
            applicationsById: { [app.id]: app },
            selectedApplicationId: app.id,
            pendingDeployments: {},
          },
        },
        invalid: 42,
      },
      activeAccountId: 'invalid',
      settings: {
        deployTimeoutSecs: 30,
        refreshIntervalSecs: 15,
        workflowRuns: 50,
      },
    })

    expect(migrated?.activeAccountId).toBe('valid')
    expect(Object.keys(migrated?.accountsById ?? {})).toEqual(['valid'])
    expect(migrated?.accountsById.valid.id).toBe('valid')
    expect(migrated?.accountsById.valid.token).toBe('ghp_valid')
    expect(migrated?.accountsById.valid.workspace.selectedApplicationId).toBe(
      app.id
    )
    expect(migrated?.settings?.workflowRuns).toBe(50)
  })
})

describe('active account workspace helpers', () => {
  test('create one active account and route token and selection through it', () => {
    const state = createInitialAppState()
    const app = appConfig('app-1')

    setActiveAccountToken(state, 'ghp_active')
    const workspace = getActiveWorkspace(state)
    workspace.applicationsById[app.id] = app
    selectActiveApplication(state, app.id)

    expect(state.activeAccountId).toBe(DEFAULT_ACCOUNT_ID)
    expect(state.token).toBe('ghp_active')
    expect(state.applicationsById).toEqual({ [app.id]: app })
    expect(state.selectedApplicationId).toBe(app.id)
    expect(state.selectedApplication).toBe(app)
  })

  test('recovers active account by dictionary key when account id mismatches', () => {
    const state = createInitialAppState()
    const workspace = getActiveWorkspace(state)
    workspace.applicationsById = { 'app-1': appConfig('app-1') }

    state.accountsById[DEFAULT_ACCOUNT_ID].id = 'stale-id'
    state.activeAccountId = 'missing'

    expect(getActiveAccount(state)).toBeUndefined()
    expect(getActiveWorkspace(state)).toBe(
      state.accountsById[DEFAULT_ACCOUNT_ID].workspace
    )
    expect(state.activeAccountId).toBe(DEFAULT_ACCOUNT_ID)
  })

  test('copies application records when replacing active applications', () => {
    const state = createInitialAppState()
    const app = appConfig('app-1')
    const applicationsById = { [app.id]: app }

    setActiveAccountApplications(state, applicationsById)
    delete applicationsById[app.id]

    expect(state.applicationsById).toEqual({ [app.id]: app })
  })
})
