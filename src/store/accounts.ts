import { v4 as uuid } from 'uuid'
import type {
  AccountProfile,
  AccountWorkspace,
  ApplicationConfig,
  PendingDeployment,
} from '../state/schemas'

export const DEFAULT_ACCOUNT_ID = 'default-account'
export const DEFAULT_ACCOUNT_NAME = 'GitHub account'

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
  token = '',
  githubLogin,
  githubUserId,
  workspace,
}: {
  id: string
  token?: string
  githubLogin?: string
  githubUserId?: string
  workspace?: Partial<AccountWorkspace>
}): AccountProfile {
  return {
    id,
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
    token,
    workspace: {
      applicationsById,
      selectedApplicationId,
      pendingDeployments,
    },
  })
}

export function addAccountProfile(
  state: AccountContainerState,
  {
    id = uuid(),
    token,
    githubLogin,
    githubUserId,
  }: {
    id?: string
    token: string
    githubLogin: string
    githubUserId: string
  }
) {
  const account = createAccountProfile({
    id,
    token,
    githubLogin,
    githubUserId,
  })
  state.accountsById[account.id] = account
  state.activeAccountId = account.id
  return account
}

export function findAccountByGitHubUserId(
  state: AccountContainerState,
  githubUserId: string
) {
  return Object.values(state.accountsById).find(
    (account) => account.githubUserId === githubUserId
  )
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

export function setActiveAccount(
  state: AccountContainerState,
  accountId: string
) {
  if (!state.accountsById[accountId]) return false

  state.activeAccountId = accountId
  return true
}

export function updateAccountProfile(
  state: AccountContainerState,
  accountId: string,
  update: Partial<
    Pick<AccountProfile, 'token' | 'githubLogin' | 'githubUserId'>
  >
) {
  const account = state.accountsById[accountId]
  if (!account) return undefined

  if (update.token !== undefined) {
    account.token = update.token
  }
  if (update.githubLogin !== undefined) {
    account.githubLogin = update.githubLogin
  }
  if (update.githubUserId !== undefined) {
    account.githubUserId = update.githubUserId
  }

  return account
}

export function removeAccountProfile(
  state: AccountContainerState,
  accountId: string
) {
  const account = state.accountsById[accountId]
  if (!account) return undefined

  delete state.accountsById[accountId]

  if (state.activeAccountId === accountId) {
    state.activeAccountId = Object.keys(state.accountsById)[0] ?? ''
  }

  return account
}

export function ensureActiveAccount(state: AccountContainerState) {
  const activeAccount = getActiveAccount(state)
  if (activeAccount) return activeAccount

  const firstAccountId = Object.keys(state.accountsById)[0]
  if (firstAccountId) {
    state.activeAccountId = firstAccountId
    return state.accountsById[firstAccountId]
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

export function formatAccountName(account: AccountProfile | undefined) {
  return account?.githubLogin ? `@${account.githubLogin}` : DEFAULT_ACCOUNT_NAME
}

export function setActiveAccountApplications(
  state: AccountContainerState,
  applicationsById: Record<string, ApplicationConfig>
) {
  const workspace = getActiveWorkspace(state)
  workspace.applicationsById = { ...applicationsById }
  workspace.selectedApplicationId = normalizeSelectedApplicationId(
    workspace.applicationsById,
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
