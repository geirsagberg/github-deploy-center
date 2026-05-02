import './setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import App from '../src/App'
import { appState } from '../src/store'

afterEach(() => {
  cleanup()
  appState.accountsById = {}
  appState.activeAccountId = ''
})

describe('App account setup state', () => {
  test('shows first-account setup when no accounts exist', () => {
    appState.accountsById = {}
    appState.activeAccountId = ''

    const { getByLabelText, getByRole, getByText } = render(<App />)
    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement
    const githubLink = getByRole('link', { name: /github repository/i })

    expect(getByText('Add your GitHub account')).toBeTruthy()
    expect(tokenInput.type).toBe('password')
    expect(githubLink.getAttribute('href')).toBe(
      'https://github.com/geirsagberg/github-deploy-center'
    )
  })
})
