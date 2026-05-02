import { z } from 'zod'
import {
  applicationConfigSchema,
  appSettingsSchema,
  pendingDeploymentSchema,
} from '../state/schemas'
import type {
  AccountProfile,
  AccountWorkspace,
  AppSettings,
} from '../state/schemas'
import {
  createAccountProfile,
  createAccountWorkspace,
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
  const accountsById = Object.fromEntries(
    Object.entries(state.accountsById ?? {})
      .map(
        ([id, account]) =>
          [id, normalizeAccountProfile(id, account)] as const
      )
      .filter((entry): entry is readonly [string, AccountProfile] => !!entry[1])
  )
  const activeAccountId = pickActiveAccountId(
    accountsById,
    state.activeAccountId
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

  return createAccountProfile({
    id,
    token: parsed.data.token,
    githubLogin: parsed.data.githubLogin,
    githubUserId: parsed.data.githubUserId,
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
