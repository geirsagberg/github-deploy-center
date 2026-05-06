import {
  useFetchApplicationReleases,
  useFetchReleases,
  useFetchWorkflowRuns,
} from '../api/fetchHooks'
import {
  getEnvironmentStatuses,
  projectDeploymentMatrix,
  type EnvironmentStatusesByApplicationId,
} from '../state/deploymentMatrix'
import type { ApplicationConfig } from '../state/schemas'
import { useAppState } from './state'

export function useSelectedDeploymentMatrix() {
  const { pendingDeployments, selectedApplication } = useAppState()
  const releasesQuery = useFetchReleases()
  const workflowRunsQuery = useFetchWorkflowRuns()
  const matrix = selectedApplication
    ? projectDeploymentMatrix({
        application: selectedApplication,
        pendingDeployments,
        releases: releasesQuery.data ?? [],
        workflowRuns: workflowRunsQuery.data ?? {},
      })
    : undefined

  return {
    matrix,
    selectedApplication,
    isLoading: releasesQuery.isLoading,
    releaseError: releasesQuery.error,
    workflowRunsError: workflowRunsQuery.error,
  }
}

export function useApplicationEnvironmentStatuses(
  applications: ApplicationConfig[],
): EnvironmentStatusesByApplicationId {
  const { pendingDeployments } = useAppState()
  const releaseQueriesByApplicationId =
    useFetchApplicationReleases(applications)

  return Object.fromEntries(
    applications.map((application) => {
      const matrix = projectDeploymentMatrix({
        application,
        pendingDeployments,
        releases: releaseQueriesByApplicationId[application.id]?.data ?? [],
      })

      return [application.id, getEnvironmentStatuses(matrix)]
    }),
  )
}
