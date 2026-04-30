import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAccountProfile } from '../../src/store/accounts'
import { AccountSwitcherView } from '../../src/components/AccountSwitcherView'
import type { AddAccountInput } from '../../src/store/actions'

afterEach(() => {
  cleanup()
})

describe('AccountSwitcherView', () => {
  test('shows account labels and login metadata while switching accounts', async () => {
    const selectedAccountIds: string[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByText } = render(
      <AccountSwitcherView
        accountsById={{
          work: createAccountProfile({
            id: 'work',
            label: 'Work',
            token: 'ghp_work',
            githubLogin: 'work-octocat',
            githubUserId: 'U_work',
          }),
          personal: createAccountProfile({
            id: 'personal',
            label: 'Personal',
            token: 'ghp_personal',
            githubLogin: 'octocat',
            githubUserId: 'U_personal',
          }),
        }}
        activeAccountId="work"
        addAccount={async () => {}}
        editAccount={async () => {}}
        selectAccount={(accountId) => selectedAccountIds.push(accountId)}
      />
    )

    expect(getByText('Signed in as @work-octocat')).toBeTruthy()

    await user.selectOptions(getByLabelText(/active account/i), 'personal')

    expect(selectedAccountIds).toEqual(['personal'])
  })

  test('adds another account from the dialog', async () => {
    const submitted: AddAccountInput[] = []
    const user = userEvent.setup()

    const { getByRole, getByLabelText } = render(
      <AccountSwitcherView
        accountsById={{
          work: createAccountProfile({
            id: 'work',
            label: 'Work',
            token: 'ghp_work',
            githubLogin: 'work-octocat',
            githubUserId: 'U_work',
          }),
        }}
        activeAccountId="work"
        addAccount={async (input) => {
          submitted.push(input)
        }}
        editAccount={async () => {}}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /add account/i }))
    const dialog = getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/account label/i), 'Client')
    await user.type(getByLabelText(/personal access token/i), 'ghp_client')
    await user.click(within(dialog).getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          label: 'Client',
          token: 'ghp_client',
        },
      ])
    })
  })

  test('edits the active account from the dialog', async () => {
    const submitted: unknown[] = []
    const user = userEvent.setup()

    const { getByRole } = render(
      <AccountSwitcherView
        accountsById={{
          work: createAccountProfile({
            id: 'work',
            label: 'Work',
            token: 'ghp_work',
            githubLogin: 'work-octocat',
            githubUserId: 'U_work',
          }),
        }}
        activeAccountId="work"
        addAccount={async () => {}}
        editAccount={async (input) => {
          submitted.push(input)
        }}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /edit account/i }))
    const dialog = getByRole('dialog')
    const labelInput = within(dialog).getByLabelText(
      /account label/i
    ) as HTMLInputElement
    const tokenInput = within(dialog).getByLabelText(
      /replace personal access token/i
    ) as HTMLInputElement

    expect(labelInput.value).toBe('Work')
    expect(tokenInput.type).toBe('password')

    await user.clear(labelInput)
    await user.type(labelInput, 'Work deploys')
    await user.click(
      within(dialog).getByRole('button', { name: /save account/i })
    )

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          accountId: 'work',
          label: 'Work deploys',
          token: '',
        },
      ])
    })
  })
})
