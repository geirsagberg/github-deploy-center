import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import {
  getApplicationIdFromQueryString,
  replaceApplicationInQueryString,
  selectApplicationFromQueryString,
} from '../../src/store/applicationQueryString'
import { createAccountProfile } from '../../src/store/accounts'
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

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('application query string selection', () => {
  test('selects the application named in the query string', () => {
    const firstApp = appConfig('app-1')
    const secondApp = appConfig('app-2')
    const state = createInitialAppState()
    state.accountsById.work = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      workspace: {
        applicationsById: {
          [firstApp.id]: firstApp,
          [secondApp.id]: secondApp,
        },
        selectedApplicationId: firstApp.id,
      },
    })
    state.activeAccountId = 'work'

    const selectedApplicationId = selectApplicationFromQueryString(
      state,
      '?application=app-2'
    )

    expect(selectedApplicationId).toBe(secondApp.id)
    expect(state.selectedApplication).toBe(secondApp)
  })

  test('does not create an account when the query string has no matching workspace', () => {
    const state = createInitialAppState()

    selectApplicationFromQueryString(state, '?application=app-2')

    expect(state.accountsById).toEqual({})
    expect(state.selectedApplicationId).toBe('')
  })

  test('reads the application query parameter', () => {
    expect(getApplicationIdFromQueryString('?application=app-2')).toBe('app-2')
    expect(getApplicationIdFromQueryString('?account=work')).toBe('')
  })

  test('writes the selected application without dropping other URL parts', () => {
    window.history.replaceState(null, '', '/deploy?account=work#releases')

    replaceApplicationInQueryString('app-2')

    expect(window.location.pathname).toBe('/deploy')
    expect(window.location.search).toBe('?account=work&application=app-2')
    expect(window.location.hash).toBe('#releases')
  })

  test('removes the application query parameter when no application is selected', () => {
    window.history.replaceState(null, '', '/deploy?application=app-2&account=work')

    replaceApplicationInQueryString('')

    expect(window.location.search).toBe('?account=work')
  })
})
