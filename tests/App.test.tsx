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

    const { getByLabelText, getByText } = render(<App />)
    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement

    expect(getByText('Add your GitHub account')).toBeTruthy()
    expect(getByLabelText(/account label/i)).toBeTruthy()
    expect(tokenInput.type).toBe('password')
  })
})
