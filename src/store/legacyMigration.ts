import { z } from 'zod'
import {
  applicationsByIdSchema,
  appSettingsSchema,
  pendingDeploymentsSchema,
} from '../state/schemas'
import type { PersistedState } from './persistedState'
import { createDefaultAccount } from './accounts'

export const MIGRATED_ACCOUNT_ID = 'legacy-account'

const legacyPersistedStateSchema = z.object({
  token: z.string().optional(),
  applicationsById: applicationsByIdSchema.optional(),
  selectedApplicationId: z.string().optional(),
  pendingDeployments: pendingDeploymentsSchema.optional(),
  settings: appSettingsSchema.optional(),
})

type LegacyPersistedState = z.infer<typeof legacyPersistedStateSchema>

export function migrateLegacyPersistedState(
  data: unknown
): PersistedState | undefined {
  const parsed = legacyPersistedStateSchema.safeParse(data)
  if (!parsed.success) return undefined

  return toAccountPersistedState(parsed.data)
}

function toAccountPersistedState(state: LegacyPersistedState): PersistedState {
  const shouldCreateAccount =
    !!state.token ||
    Object.keys(state.applicationsById ?? {}).length > 0 ||
    !!state.selectedApplicationId ||
    Object.keys(state.pendingDeployments ?? {}).length > 0

  if (!shouldCreateAccount) {
    return {
      accountsById: {},
      activeAccountId: '',
      settings: state.settings,
    }
  }

  const account = createDefaultAccount({
    id: MIGRATED_ACCOUNT_ID,
    token: state.token ?? '',
    applicationsById: state.applicationsById ?? {},
    selectedApplicationId: state.selectedApplicationId ?? '',
    pendingDeployments: state.pendingDeployments ?? {},
  })

  return {
    accountsById: { [MIGRATED_ACCOUNT_ID]: account },
    activeAccountId: MIGRATED_ACCOUNT_ID,
    settings: state.settings,
  }
}
