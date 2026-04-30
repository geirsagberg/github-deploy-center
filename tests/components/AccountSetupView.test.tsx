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
  test('collects a label and password PAT before adding the account', async () => {
    const submitted: AddAccountInput[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByRole, getByText } = render(
      <AccountSetupView
        addAccount={async (input) => {
          submitted.push(input)
        }}
      />
    )

    const tokenInput = getByLabelText(
      /personal access token/i
    ) as HTMLInputElement
    expect(tokenInput.type).toBe('password')
    expect(getByText(/stored in your browser's local storage/i)).toBeTruthy()

    await user.type(getByLabelText(/account label/i), 'Work')
    await user.type(tokenInput, 'ghp_valid')
    await user.click(getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          label: 'Work',
          token: 'ghp_valid',
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
    await user.type(getByLabelText(/account label/i), 'Work')
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
