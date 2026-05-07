import './setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { appState } from '../src/store'
import { createAccountProfile } from '../src/store/accounts'

afterEach(() => {
  cleanup()
  appState.accountsById = {}
  appState.activeAccountId = ''
})

describe('App account setup state', () => {
  test('shows first-account setup when no accounts exist', () => {
    appState.accountsById = {}
    appState.activeAccountId = ''

    const { getByLabelText, getByRole, getByText, queryByRole } = render(<App />)
    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement
    const rememberTokenCheckbox = getByLabelText(
      /remember token between sessions/i
    ) as HTMLInputElement
    const githubLink = getByRole('link', { name: /github repository/i })

    expect(getByText('Connect GitHub Account')).toBeTruthy()
    expect(tokenInput.type).toBe('password')
    expect(rememberTokenCheckbox.checked).toBe(true)
    expect(
      queryByRole('button', { name: /active account/i })
    ).toBeNull()
    expect(githubLink.getAttribute('href')).toBe(
      'https://github.com/geirsagberg/github-deploy-center'
    )
  })

  test('shows reconnect setup for a local-storage account without a PAT', () => {
    appState.accountsById = {
      work: createAccountProfile({
        id: 'work',
        token: '',
        tokenStorage: 'local',
        githubLogin: 'work-octocat',
        githubUserId: 'U_work',
      }),
    }
    appState.activeAccountId = 'work'

    const { getByLabelText, getByRole, getByText } = render(<App />)
    const rememberTokenCheckbox = getByLabelText(
      /remember token between sessions/i
    ) as HTMLInputElement

    expect(
      getByRole('heading', { name: 'Reconnect @work-octocat' })
    ).toBeTruthy()
    expect(
      getByText('Enter a personal access token to load this saved account.')
    ).toBeTruthy()
    expect(rememberTokenCheckbox.checked).toBe(true)
  })

  test('shows reconnect setup for a session-storage account without a PAT', () => {
    appState.accountsById = {
      work: createAccountProfile({
        id: 'work',
        token: '',
        tokenStorage: 'session',
        githubLogin: 'work-octocat',
        githubUserId: 'U_work',
      }),
    }
    appState.activeAccountId = 'work'

    const { getByLabelText, getByRole } = render(<App />)
    const rememberTokenCheckbox = getByLabelText(
      /remember token between sessions/i
    ) as HTMLInputElement

    expect(
      getByRole('heading', { name: 'Reconnect @work-octocat' })
    ).toBeTruthy()
    expect(rememberTokenCheckbox.checked).toBe(false)
  })

  test('resets reconnect token storage when switching tokenless accounts', async () => {
    const user = userEvent.setup()
    appState.accountsById = {
      work: createAccountProfile({
        id: 'work',
        token: '',
        tokenStorage: 'local',
        githubLogin: 'work-octocat',
        githubUserId: 'U_work',
      }),
      personal: createAccountProfile({
        id: 'personal',
        token: '',
        tokenStorage: 'session',
        githubLogin: 'octocat',
        githubUserId: 'U_personal',
      }),
    }
    appState.activeAccountId = 'work'

    const { getByLabelText, getByRole } = render(<App />)
    const rememberTokenCheckbox = () =>
      getByLabelText(/remember token between sessions/i) as HTMLInputElement
    const tokenInput = () =>
      getByLabelText(/personal access token/i) as HTMLInputElement

    expect(rememberTokenCheckbox().checked).toBe(true)
    await user.type(tokenInput(), 'ghp_unsaved')

    await user.click(
      getByRole('button', { name: /active account: @work-octocat/i })
    )
    await user.click(getByRole('menuitem', { name: /@octocat/i }))

    await waitFor(() => {
      expect(
        getByRole('heading', { name: 'Reconnect @octocat' })
      ).toBeTruthy()
    })
    expect(rememberTokenCheckbox().checked).toBe(false)
    expect(tokenInput().value).toBe('')
  })

  test('shows compact account switcher before the GitHub link', () => {
    appState.accountsById = {
      work: createAccountProfile({
        id: 'work',
        githubLogin: 'work-octocat',
        githubUserId: 'U_work',
      }),
    }
    appState.activeAccountId = 'work'

    const { getByRole } = render(<App />)
    const accountTrigger = getByRole('button', {
      name: /active account: @work-octocat/i,
    })
    const githubLink = getByRole('link', { name: /github repository/i })

    expect(
      !!(
        accountTrigger.compareDocumentPosition(githubLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true)
  })
})
