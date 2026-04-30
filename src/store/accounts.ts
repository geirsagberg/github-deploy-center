import type {
  AccountProfile,
  AccountWorkspace,
  ApplicationConfig,
  PendingDeployment,
} from '../state/schemas'

export const DEFAULT_ACCOUNT_ID = 'default-account'
export const DEFAULT_ACCOUNT_LABEL = 'Default account'

type AccountContainerState = {
  accountsById: Record<string, AccountProfile>
  activeAccountId: string
}

export function createAccountWorkspace({
  applicationsById = {},
  selectedApplicationId = '',
  pendingDeployments = {},
}: Partial<AccountWorkspace> = {}): AccountWorkspace {
  return {
    applicationsById: { ...applicationsById },
    selectedApplicationId: normalizeSelectedApplicationId(
      applicationsById,
      selectedApplicationId
    ),
    pendingDeployments: { ...pendingDeployments },
  }
}

export function createAccountProfile({
  id,
  label = DEFAULT_ACCOUNT_LABEL,
  token = '',
  githubLogin,
  githubUserId,
  workspace,
}: {
  id: string
  label?: string
  token?: string
  githubLogin?: string
  githubUserId?: string
  workspace?: Partial<AccountWorkspace>
}): AccountProfile {
  return {
    id,
    label: label || DEFAULT_ACCOUNT_LABEL,
    token,
    githubLogin,
    githubUserId,
    workspace: createAccountWorkspace(workspace),
  }
}

export function createDefaultAccount({
  id = DEFAULT_ACCOUNT_ID,
  token = '',
  applicationsById = {},
  selectedApplicationId = '',
  pendingDeployments = {},
}: {
  id?: string
  token?: string
  applicationsById?: Record<string, ApplicationConfig>
  selectedApplicationId?: string
  pendingDeployments?: Record<string, PendingDeployment>
} = {}): AccountProfile {
  return createAccountProfile({
    id,
    label: DEFAULT_ACCOUNT_LABEL,
    token,
    workspace: {
      applicationsById,
      selectedApplicationId,
      pendingDeployments,
    },
  })
}

export function normalizeSelectedApplicationId(
  applicationsById: Record<string, ApplicationConfig>,
  selectedApplicationId?: string
) {
  if (selectedApplicationId && applicationsById[selectedApplicationId]) {
    return selectedApplicationId
  }

  return Object.keys(applicationsById)[0] ?? ''
}

export function getActiveAccount(state: AccountContainerState) {
  return state.accountsById[state.activeAccountId]
}

export function ensureActiveAccount(state: AccountContainerState) {
  const activeAccount = getActiveAccount(state)
  if (activeAccount) return activeAccount

  const firstAccount = Object.values(state.accountsById)[0]
  if (firstAccount) {
    state.activeAccountId = firstAccount.id
    return firstAccount
  }

  const account = createDefaultAccount()
  state.accountsById[account.id] = account
  state.activeAccountId = account.id
  return account
}

export function getActiveWorkspace(state: AccountContainerState) {
  return ensureActiveAccount(state).workspace
}

export function getSelectedApplication(state: AccountContainerState) {
  const workspace = getActiveAccount(state)?.workspace
  if (!workspace) return undefined

  return workspace.applicationsById[workspace.selectedApplicationId]
}

export function setActiveAccountToken(
  state: AccountContainerState,
  token: string
) {
  ensureActiveAccount(state).token = token
}

export function setActiveAccountApplications(
  state: AccountContainerState,
  applicationsById: Record<string, ApplicationConfig>
) {
  const workspace = getActiveWorkspace(state)
  workspace.applicationsById = applicationsById
  workspace.selectedApplicationId = normalizeSelectedApplicationId(
    applicationsById,
    workspace.selectedApplicationId
  )
}

export function selectActiveApplication(
  state: AccountContainerState,
  applicationId: string
) {
  const workspace = getActiveWorkspace(state)
  workspace.selectedApplicationId = normalizeSelectedApplicationId(
    workspace.applicationsById,
    applicationId
  )
}

export function deleteActiveApplication(
  state: AccountContainerState,
  applicationId: string
) {
  const workspace = getActiveWorkspace(state)
  delete workspace.applicationsById[applicationId]
  workspace.selectedApplicationId = normalizeSelectedApplicationId(
    workspace.applicationsById,
    workspace.selectedApplicationId
  )
}
