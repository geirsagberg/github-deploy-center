import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountSetupView } from '../../src/components/AccountSetupView'
import type { AddAccountInput } from '../../src/store/actions'

afterEach(() => {
  cleanup()
})

describe('AccountSetupView', () => {
  test('collects a password PAT before adding the account', async () => {
    const submitted: AddAccountInput[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByRole, queryByText } = render(
      <AccountSetupView
        addAccount={async (input) => {
          submitted.push(input)
        }}
      />
    )

    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement
    const rememberTokenCheckbox = getByLabelText(
      /remember token between sessions/i
    ) as HTMLInputElement
    expect(tokenInput.type).toBe('password')
    expect(rememberTokenCheckbox.checked).toBe(true)
    expect(queryByText(/stored in your browser's local storage/i)).toBeNull()

    await user.type(tokenInput, 'ghp_valid')
    await user.click(getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          token: 'ghp_valid',
          tokenStorage: 'local',
        },
      ])
    })
  })

  test('submits the session-only PAT storage choice', async () => {
    const submitted: AddAccountInput[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByRole } = render(
      <AccountSetupView
        addAccount={async (input) => {
          submitted.push(input)
        }}
      />
    )

    await user.type(getByLabelText(/personal access token/i), 'ghp_valid')
    await user.click(getByLabelText(/remember token between sessions/i))
    await user.click(getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          token: 'ghp_valid',
          tokenStorage: 'session',
        },
      ])
    })
  })

  test('shows add-account errors without clearing the entered PAT', async () => {
    const user = userEvent.setup()

    const { getByLabelText, getByRole } = render(
      <AccountSetupView
        addAccount={async () => {
          throw new Error(
            'Could not validate that personal access token. Check the token and try again.'
          )
        }}
      />
    )

    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement
    await user.type(tokenInput, 'ghp_invalid')
    await user.click(getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(getByRole('alert').textContent).toContain(
        'Could not validate that personal access token'
      )
    })
    expect(tokenInput.value).toBe('ghp_invalid')
  })
})
