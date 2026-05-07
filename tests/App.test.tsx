import './setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
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
