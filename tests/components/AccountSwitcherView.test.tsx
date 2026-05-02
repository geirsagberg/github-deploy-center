import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAccountProfile } from '../../src/store/accounts'
import { AccountSwitcherView } from '../../src/components/AccountSwitcherView'
import {
  DifferentIdentityTokenError,
  type AddAccountInput,
} from '../../src/store/actions'

afterEach(() => {
  cleanup()
})

describe('AccountSwitcherView', () => {
  test('shows GitHub account identity while switching accounts', async () => {
    const selectedAccountIds: string[] = []
    const user = userEvent.setup()

    const { getByLabelText } = render(
      <AccountSwitcherView
        accountsById={{
          work: createAccountProfile({
            id: 'work',
            token: 'ghp_work',
            githubLogin: 'work-octocat',
            githubUserId: 'U_work',
          }),
          personal: createAccountProfile({
            id: 'personal',
            token: 'ghp_personal',
            githubLogin: 'octocat',
            githubUserId: 'U_personal',
          }),
        }}
        activeAccountId="work"
        addAccount={async () => {}}
        editAccount={async () => {}}
        removeAccount={async () => true}
        selectAccount={(accountId) => selectedAccountIds.push(accountId)}
      />
    )

    const accountSelect = getByLabelText(/active account/i) as HTMLSelectElement
    expect(accountSelect.selectedOptions[0].textContent).toBe('@work-octocat')

    await user.selectOptions(accountSelect, 'personal')

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
        removeAccount={async () => true}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /add account/i }))
    const dialog = getByRole('dialog')

    await user.type(getByLabelText(/personal access token/i), 'ghp_client')
    await user.click(within(dialog).getByRole('button', { name: /add account/i }))

    await waitFor(() => {
      expect(submitted).toEqual([
        {
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
        removeAccount={async () => true}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /edit account/i }))
    const dialog = getByRole('dialog')
    const tokenInput = within(dialog).getByLabelText(
      /replace personal access token/i
    ) as HTMLInputElement

    expect(tokenInput.type).toBe('password')

    await user.type(tokenInput, 'ghp_replacement')
    await user.click(
      within(dialog).getByRole('button', { name: /save account/i })
    )

    await waitFor(() => {
      expect(submitted).toEqual([
        {
          accountId: 'work',
          token: 'ghp_replacement',
        },
      ])
    })
  })

  test('offers to add a different replacement identity as a new account', async () => {
    const added: AddAccountInput[] = []
    const user = userEvent.setup()
    const account = createAccountProfile({
      id: 'work',
      token: 'ghp_work',
      githubLogin: 'work-octocat',
      githubUserId: 'U_work',
    })

    const { getByRole } = render(
      <AccountSwitcherView
        accountsById={{ work: account }}
        activeAccountId="work"
        addAccount={async (input) => {
          added.push(input)
        }}
        editAccount={async () => {
          throw new DifferentIdentityTokenError({
            currentAccount: account,
            replacementIdentity: {
              id: 'U_personal',
              login: 'octocat',
            },
          })
        }}
        removeAccount={async () => true}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /edit account/i }))
    const dialog = getByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(/replace personal access token/i),
      'ghp_personal'
    )
    await user.click(
      within(dialog).getByRole('button', { name: /save account/i })
    )
    await user.click(
      await within(dialog).findByRole('button', { name: /add @octocat/i })
    )

    await waitFor(() => {
      expect(added).toEqual([
        {
          token: 'ghp_personal',
        },
      ])
    })
  })

  test('removes the active account from the edit dialog', async () => {
    const removed: string[] = []
    const user = userEvent.setup()

    const { getByRole } = render(
      <AccountSwitcherView
        accountsById={{
          work: createAccountProfile({
            id: 'work',
            token: 'ghp_work',
          }),
        }}
        activeAccountId="work"
        addAccount={async () => {}}
        editAccount={async () => {}}
        removeAccount={async (accountId) => {
          removed.push(accountId)
          return true
        }}
        selectAccount={() => {}}
      />
    )

    await user.click(getByRole('button', { name: /edit account/i }))
    const dialog = getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: /remove account/i })
    )

    await waitFor(() => {
      expect(removed).toEqual(['work'])
    })
  })
})
