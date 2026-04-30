import { z } from 'zod'
import {
  accountsByIdSchema,
  appSettingsSchema,
} from '../state/schemas'
import type { AccountProfile, AppSettings } from '../state/schemas'
import { createAccountProfile } from './accounts'
import { migrateLegacyPersistedState } from './legacyMigration'

export type PersistedState = {
  accountsById: Record<string, AccountProfile>
  activeAccountId: string
  settings?: AppSettings
}

const accountPersistedStateSchema = z.object({
  accountsById: accountsByIdSchema.optional(),
  activeAccountId: z.string().optional(),
  settings: appSettingsSchema.optional(),
})

type AccountPersistedState = z.infer<typeof accountPersistedStateSchema>

export function parsePersistedState(data: unknown): PersistedState | undefined {
  if (isAccountPersistedStateLike(data)) {
    const parsed = accountPersistedStateSchema.safeParse(data)
    return parsed.success ? normalizeAccountPersistedState(parsed.data) : undefined
  }

  // Keep the legacy fallback behind one call so it can be deleted cleanly later.
  return migrateLegacyPersistedState(data)
}

function normalizeAccountPersistedState(
  state: AccountPersistedState
): PersistedState {
  const accountsById = Object.fromEntries(
    Object.entries(state.accountsById ?? {}).map(([id, account]) => [
      id,
      createAccountProfile({
        ...account,
        id,
        workspace: account.workspace,
      }),
    ])
  )
  const activeAccountId = pickActiveAccountId(
    accountsById,
    state.activeAccountId
  )

  return {
    accountsById,
    activeAccountId,
    settings: state.settings,
  }
}

function pickActiveAccountId(
  accountsById: Record<string, AccountProfile>,
  activeAccountId?: string
) {
  if (activeAccountId && accountsById[activeAccountId]) {
    return activeAccountId
  }

  return Object.keys(accountsById)[0] ?? ''
}

function isAccountPersistedStateLike(data: unknown) {
  return (
    !!data &&
    typeof data === 'object' &&
    ('accountsById' in data || 'activeAccountId' in data)
  )
}
