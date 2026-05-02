import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_ACCOUNT_ID,
  createAccountProfile,
  getActiveAccount,
  getActiveWorkspace,
  removeAccountProfile,
  selectActiveApplication,
  setActiveAccount,
  setActiveAccountApplications,
  setActiveAccountToken,
} from '../../src/store/accounts'
import {
  addAccountToState,
  editAccountInState,
  exportApplicationsFromState,
  importApplicationsToState,
  removeAccountFromState,
} from '../../src/store/actions'
import { mergeImportedApplications } from '../../src/store/applicationImport'
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

const githubIdentity = (id: string, login: string) => ({
  id,
  login,
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

describe('add account action', () => {
  test('validates, saves, and activates a new account', async () => {
    const state = createInitialAppState()
    const requestedTokens: string[] = []

    const account = await addAccountToState(
      state,
      {
        token: ' ghp_valid ',
      },
      async (token) => {
        requestedTokens.push(token)
        return githubIdentity('U_123', 'octocat')
      }
    )

    expect(requestedTokens).toEqual(['ghp_valid'])
    expect(state.activeAccountId).toBe(account.id)
    expect(Object.keys(state.accountsById)).toEqual([account.id])
    expect(account.token).toBe('ghp_valid')
    expect(account.githubLogin).toBe('octocat')
    expect(account.githubUserId).toBe('U_123')
  })

  test('rejects invalid PATs without saving an account', async () => {
    const state = createInitialAppState()

    let error: unknown
    try {
      await addAccountToState(
        state,
        {
          token: 'ghp_invalid',
        },
        async () => {
          throw new Error('Bad credentials')
        }
      )
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain(
      'Could not validate that personal access token'
    )
    expect(state.accountsById).toEqual({})
    expect(state.activeAccountId).toBe('')
  })

  test('adds a second account without changing the existing workspace', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.activeAccountId = 'work'

    const account = await addAccountToState(
      state,
      {
        token: 'ghp_personal',
      },
      async () => githubIdentity('U_personal', 'octocat')
    )

    expect(state.activeAccountId).toBe(account.id)
    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [workApp.id]: workApp,
    })
    expect(account.workspace.applicationsById).toEqual({})
  })

  test('updates an existing identity instead of creating a duplicate account', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_old',
      githubLogin: 'work-octocat',
      githubUserId: 'U_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.activeAccountId = 'work'

    const account = await addAccountToState(
      state,
      {
        token: 'ghp_new',
      },
      async () => githubIdentity('U_work', 'work-octocat')
    )

    expect(account.id).toBe('work')
    expect(Object.keys(state.accountsById)).toEqual(['work'])
    expect(state.activeAccountId).toBe('work')
    expect(state.accountsById.work.token).toBe('ghp_new')
    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [workApp.id]: workApp,
    })
  })
})

describe('account switching', () => {
  test('switches token, applications, and selected application by active account', () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    const personalApp = appConfig('personal-app')

    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.accountsById.personal = createAccountProfile({
      id: 'personal',
      token: 'ghp_personal',
      workspace: {
        applicationsById: { [personalApp.id]: personalApp },
        selectedApplicationId: personalApp.id,
      },
    })
    state.activeAccountId = 'work'

    expect(state.token).toBe('ghp_work')
    expect(state.applicationsById).toEqual({ [workApp.id]: workApp })
    expect(state.selectedApplication).toBe(workApp)

    expect(setActiveAccount(state, 'personal')).toBe(true)

    expect(state.token).toBe('ghp_personal')
    expect(state.applicationsById).toEqual({
      [personalApp.id]: personalApp,
    })
    expect(state.selectedApplication).toBe(personalApp)

    expect(setActiveAccount(state, 'work')).toBe(true)
    expect(state.selectedApplication).toBe(workApp)
  })

  test('does not switch to a missing account', () => {
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
    })
    state.activeAccountId = 'work'

    expect(setActiveAccount(state, 'missing')).toBe(false)
    expect(state.activeAccountId).toBe('work')
  })

  test('updates applications only in the active account workspace', () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    const personalApp = appConfig('personal-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.accountsById.personal = createAccountProfile({
      id: 'personal',
      token: 'ghp_personal',
    })
    state.activeAccountId = 'personal'

    setActiveAccountApplications(state, { [personalApp.id]: personalApp })

    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [workApp.id]: workApp,
    })
    expect(state.accountsById.personal.workspace.applicationsById).toEqual({
      [personalApp.id]: personalApp,
    })
  })
})

describe('edit account action', () => {
  test('does not validate the PAT when no replacement is entered', async () => {
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      githubLogin: 'work-octocat',
      githubUserId: 'U_work',
    })
    state.activeAccountId = 'work'

    await editAccountInState(
      state,
      {
        accountId: 'work',
        token: '',
      },
      async () => {
        throw new Error('Unexpected validation')
      }
    )

    expect(state.accountsById.work.token).toBe('ghp_work')
    expect(state.accountsById.work.githubLogin).toBe('work-octocat')
  })

  test('replaces a same-identity PAT while preserving the workspace', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_old',
      githubLogin: 'old-login',
      githubUserId: 'U_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
        pendingDeployments: {
          deploy: { createdAt: '2026-04-30T12:00:00.000Z' },
        },
      },
    })
    state.activeAccountId = 'work'

    await editAccountInState(
      state,
      {
        accountId: 'work',
        token: ' ghp_new ',
      },
      async () => githubIdentity('U_work', 'work-octocat')
    )

    expect(state.accountsById.work.token).toBe('ghp_new')
    expect(state.accountsById.work.githubLogin).toBe('work-octocat')
    expect(state.accountsById.work.githubUserId).toBe('U_work')
    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [workApp.id]: workApp,
    })
    expect(state.accountsById.work.workspace.selectedApplicationId).toBe(
      workApp.id
    )
    expect(state.accountsById.work.workspace.pendingDeployments.deploy).toEqual({
      createdAt: '2026-04-30T12:00:00.000Z',
    })
  })

  test('rejects a replacement PAT for a different GitHub user', async () => {
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      githubLogin: 'work-octocat',
      githubUserId: 'U_work',
    })
    state.activeAccountId = 'work'

    let error: unknown
    try {
      await editAccountInState(
        state,
        {
          accountId: 'work',
          token: 'ghp_personal',
        },
        async () => githubIdentity('U_personal', 'octocat')
      )
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('Add it as a new account')
    expect(state.accountsById.work.token).toBe('ghp_work')
    expect(state.accountsById.work.githubLogin).toBe('work-octocat')
  })
})

describe('account removal', () => {
  test('confirms removal with application count and switches away from the active account', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      githubLogin: 'work-octocat',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.accountsById.personal = createAccountProfile({
      id: 'personal',
      token: 'ghp_personal',
    })
    state.activeAccountId = 'work'
    const messages: string[] = []

    const removed = await removeAccountFromState(
      state,
      'work',
      async (message) => {
        messages.push(message)
        return true
      }
    )

    expect(removed).toBe(true)
    expect(messages[0]).toContain('1 application')
    expect(messages[0]).toContain('@work-octocat')
    expect(state.accountsById.work).toBeUndefined()
    expect(state.activeAccountId).toBe('personal')
  })

  test('keeps the account when removal is cancelled', async () => {
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
    })
    state.activeAccountId = 'work'

    const removed = await removeAccountFromState(
      state,
      'work',
      async () => false
    )

    expect(removed).toBe(false)
    expect(state.accountsById.work).toBeTruthy()
    expect(state.activeAccountId).toBe('work')
  })

  test('clears the active account when the final account is removed', () => {
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
    })
    state.activeAccountId = 'work'

    removeAccountProfile(state, 'work')

    expect(state.accountsById).toEqual({})
    expect(state.activeAccountId).toBe('')
  })
})

describe('application import and export', () => {
  test('exports only active-account applications without account credentials', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    const personalApp = appConfig('personal-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.accountsById.personal = createAccountProfile({
      id: 'personal',
      token: 'ghp_personal',
      workspace: {
        applicationsById: { [personalApp.id]: personalApp },
        selectedApplicationId: personalApp.id,
      },
    })
    state.activeAccountId = 'personal'
    const downloads: { obj: unknown; fileName: string }[] = []

    await exportApplicationsFromState(state, (obj, fileName) => {
      downloads.push({ obj, fileName })
    })

    expect(downloads).toEqual([
      {
        obj: { [personalApp.id]: personalApp },
        fileName: 'gdc-applications.json',
      },
    ])
    expect(JSON.stringify(downloads[0].obj)).not.toContain('ghp_')
  })

  test('imports applications into the active account and selects the first import when nothing is selected', async () => {
    const state = createInitialAppState()
    const workApp = appConfig('work-app')
    const personalApp = appConfig('personal-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [workApp.id]: workApp },
        selectedApplicationId: workApp.id,
      },
    })
    state.accountsById.personal = createAccountProfile({
      id: 'personal',
      token: 'ghp_personal',
    })
    state.activeAccountId = 'personal'

    await importApplicationsToState(state, async () =>
      JSON.stringify({ [personalApp.id]: personalApp })
    )

    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [workApp.id]: workApp,
    })
    expect(state.accountsById.personal.workspace.applicationsById).toEqual({
      [personalApp.id]: personalApp,
    })
    expect(
      state.accountsById.personal.workspace.selectedApplicationId
    ).toBe(personalApp.id)
  })

  test('ignores malformed import JSON without changing the active workspace', async () => {
    const state = createInitialAppState()
    const existingApp = appConfig('existing-app')
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: { [existingApp.id]: existingApp },
        selectedApplicationId: existingApp.id,
      },
    })
    state.activeAccountId = 'work'
    const errors: unknown[][] = []
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }

    try {
      await importApplicationsToState(state, async () => '{invalid json')
    } finally {
      console.error = originalConsoleError
    }

    expect(state.accountsById.work.workspace.applicationsById).toEqual({
      [existingApp.id]: existingApp,
    })
    expect(state.accountsById.work.workspace.selectedApplicationId).toBe(
      existingApp.id
    )
    expect(errors[0]?.[0]).toBe('Could not import applications JSON')
    expect(errors[0]?.[1]).toBeInstanceOf(SyntaxError)
  })

  test('keeps existing applications and assigns fresh ids for import collisions', () => {
    const existing = appConfig('shared', 'Existing')
    const collidingImport = appConfig('shared', 'Imported')
    const freshImport = appConfig('fresh', 'Fresh')
    const generatedIds = ['shared', 'generated']

    const result = mergeImportedApplications(
      { [existing.id]: existing },
      existing.id,
      {
        [collidingImport.id]: collidingImport,
        [freshImport.id]: freshImport,
      },
      () => generatedIds.shift() ?? 'fallback'
    )

    expect(result.applicationsById.shared.name).toBe('Existing')
    expect(result.applicationsById.generated).toEqual({
      ...collidingImport,
      id: 'generated',
    })
    expect(result.applicationsById.fresh).toEqual(freshImport)
    expect(result.selectedApplicationId).toBe(existing.id)
    expect(result.importedApplicationIds).toEqual(['generated', 'fresh'])
  })
})
