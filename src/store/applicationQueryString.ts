import type { AppState } from './state'
import { normalizeSelectedApplicationId } from './accounts'

export const APPLICATION_QUERY_PARAM = 'application'

export function getApplicationIdFromQueryString(
  search = typeof window === 'undefined' ? '' : window.location.search
) {
  return new URLSearchParams(search).get(APPLICATION_QUERY_PARAM) ?? ''
}

export function selectApplicationFromQueryString(
  state: AppState,
  search?: string
) {
  const applicationId = getApplicationIdFromQueryString(search)
  if (!applicationId) return state.selectedApplicationId

  const activeAccount = state.accountsById[state.activeAccountId]
  if (!activeAccount) return state.selectedApplicationId

  activeAccount.workspace.selectedApplicationId = normalizeSelectedApplicationId(
    activeAccount.workspace.applicationsById,
    applicationId
  )

  return activeAccount.workspace.selectedApplicationId
}

export function replaceApplicationInQueryString(applicationId: string) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (applicationId) {
    url.searchParams.set(APPLICATION_QUERY_PARAM, applicationId)
  } else {
    url.searchParams.delete(APPLICATION_QUERY_PARAM)
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, '', nextUrl)
  }
}
