import { z } from 'zod'
import {
  accountTokenStorageSchema,
  applicationConfigSchema,
  appSettingsSchema,
  pendingDeploymentSchema,
} from '../state/schemas'
import type {
  AccountProfile,
  AccountTokenStorage,
  AccountWorkspace,
  AppSettings,
} from '../state/schemas'
import {
  DEFAULT_TOKEN_STORAGE,
  createAccountProfile,
  createAccountWorkspace,
  getDeterministicAccountId,
  normalizeSelectedApplicationId,
} from './accounts'
import { migrateLegacyPersistedState } from './legacyMigration'

export type PersistedState = {
  accountsById: Record<string, AccountProfile>
  activeAccountId: string
  settings?: AppSettings
}

const accountPersistedStateSchema = z.object({
  accountsById: z.record(z.string(), z.unknown()).optional(),
  activeAccountId: z.string().optional(),
  settings: z.unknown().optional(),
})

type AccountPersistedState = z.infer<typeof accountPersistedStateSchema>

const partialAccountProfileSchema = z.object({
  token: z.string().optional(),
  tokenStorage: z.unknown().optional(),
  githubLogin: z.string().optional(),
  githubUserId: z.string().optional(),
  workspace: z.unknown().optional(),
})

const partialAccountWorkspaceSchema = z.object({
  applicationsById: z.record(z.string(), z.unknown()).optional(),
  selectedApplicationId: z.string().optional(),
  pendingDeployments: z.record(z.string(), z.unknown()).optional(),
})

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
  const accountIdByOldId: Record<string, string> = {}
  const accountsById = Object.entries(state.accountsById ?? {}).reduce<
    Record<string, AccountProfile>
  >((accounts, [oldId, accountData]) => {
    const account = normalizeAccountProfile(oldId, accountData)
    if (!account) return accounts

    accountIdByOldId[oldId] = account.id
    accounts[account.id] = accounts[account.id]
      ? mergeAccountProfiles(accounts[account.id], account)
      : account
    return accounts
  }, {})
  const activeAccountId = pickActiveAccountId(
    accountsById,
    state.activeAccountId
      ? accountIdByOldId[state.activeAccountId] ?? state.activeAccountId
      : undefined
  )

  return {
    accountsById,
    activeAccountId,
    settings: parseSettings(state.settings),
  }
}

function normalizeAccountProfile(id: string, data: unknown) {
  const parsed = partialAccountProfileSchema.safeParse(data)
  if (!parsed.success) return undefined
  const githubUserId = parsed.data.githubUserId
  const accountId = githubUserId ? getDeterministicAccountId(githubUserId) : id

  return createAccountProfile({
    id: accountId,
    token: parsed.data.token,
    tokenStorage: parseTokenStorage(parsed.data.tokenStorage),
    githubLogin: parsed.data.githubLogin,
    githubUserId,
    workspace: normalizeAccountWorkspace(parsed.data.workspace),
  })
}

function normalizeAccountWorkspace(data: unknown): Partial<AccountWorkspace> {
  const parsed = partialAccountWorkspaceSchema.safeParse(data)
  if (!parsed.success) return createAccountWorkspace()

  return {
    applicationsById: parseRecord(
      parsed.data.applicationsById,
      applicationConfigSchema
    ),
    selectedApplicationId: parsed.data.selectedApplicationId,
    pendingDeployments: parseRecord(
      parsed.data.pendingDeployments,
      pendingDeploymentSchema
    ),
  }
}

function parseRecord<T>(
  data: Record<string, unknown> | undefined,
  schema: z.ZodType<T>
): Record<string, T> | undefined {
  if (!data) return undefined

  return Object.fromEntries(
    Object.entries(data).flatMap(([id, value]) => {
      const parsed = schema.safeParse(value)
      return parsed.success ? [[id, parsed.data]] : []
    })
  )
}

function parseSettings(data: unknown) {
  const parsed = appSettingsSchema.safeParse(data)
  return parsed.success ? parsed.data : undefined
}

function parseTokenStorage(data: unknown): AccountTokenStorage {
  const parsed = accountTokenStorageSchema.safeParse(data)
  return parsed.success ? parsed.data : DEFAULT_TOKEN_STORAGE
}

function mergeAccountProfiles(
  existing: AccountProfile,
  incoming: AccountProfile
): AccountProfile {
  const tokenSource = existing.token ? existing : incoming.token ? incoming : existing

  return createAccountProfile({
    id: existing.id,
    token: tokenSource.token,
    tokenStorage: tokenSource.tokenStorage,
    githubLogin: existing.githubLogin ?? incoming.githubLogin,
    githubUserId: existing.githubUserId ?? incoming.githubUserId,
    workspace: mergeAccountWorkspaces(existing.workspace, incoming.workspace),
  })
}

function mergeAccountWorkspaces(
  existing: AccountWorkspace,
  incoming: AccountWorkspace
): AccountWorkspace {
  const applicationsById = {
    ...incoming.applicationsById,
    ...existing.applicationsById,
  }

  return createAccountWorkspace({
    applicationsById,
    selectedApplicationId: normalizeSelectedApplicationId(
      applicationsById,
      existing.selectedApplicationId || incoming.selectedApplicationId
    ),
    pendingDeployments: {
      ...incoming.pendingDeployments,
      ...existing.pendingDeployments,
    },
  })
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
