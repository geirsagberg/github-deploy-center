import { Box } from '@mui/material'
import { orderBy } from 'lodash-es'
import type { ReactNode } from 'react'
import { useFetchApplicationReleases } from '../api/fetchHooks'
import { DeploymentState } from '../generated/graphql'
import type { ApplicationConfig, PendingDeployment } from '../state/schemas'
import type { ReleaseModel } from '../store'
import { getDeploymentId, useAppState } from '../store'
import { ApplicationHeader } from './ApplicationHeader'
import { ApplicationNavigation } from './ApplicationNavigation'
import {
  getEnvironmentNames,
  type EnvironmentDeployStatus,
  type EnvironmentStatusesByApplicationId,
} from './applicationWorkspaceHelpers'
import { getDeploymentState, getVisibleDeployment } from './ReleasesTableView'

export type { EnvironmentDeployStatus } from './applicationWorkspaceHelpers'

type ApplicationWorkspaceProps = {
  children: ReactNode
}

type ApplicationWorkspaceViewProps = ApplicationWorkspaceProps & {
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  environmentStatusesByApplicationId?: EnvironmentStatusesByApplicationId
}

const failedDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Abandoned,
  DeploymentState.Error,
  DeploymentState.Failure,
])

const upToDateDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Active,
  DeploymentState.Success,
])

export const ApplicationWorkspace = ({
  children,
}: ApplicationWorkspaceProps) => {
  const { applicationsById, pendingDeployments, selectedApplicationId } =
    useAppState()
  const applications = getSortedApplications(applicationsById)
  const releaseQueriesByApplicationId =
    useFetchApplicationReleases(applications)
  const environmentStatusesByApplicationId = Object.fromEntries(
    applications.map((application) => [
      application.id,
      getApplicationEnvironmentStatuses({
        application,
        pendingDeployments,
        releases: releaseQueriesByApplicationId[application.id]?.data ?? [],
      }),
    ]),
  )

  return (
    <ApplicationWorkspaceView
      applicationsById={applicationsById}
      environmentStatusesByApplicationId={environmentStatusesByApplicationId}
      selectedApplicationId={selectedApplicationId}
    >
      {children}
    </ApplicationWorkspaceView>
  )
}

export function ApplicationWorkspaceView({
  applicationsById,
  children,
  selectedApplicationId,
  environmentStatusesByApplicationId = {},
}: ApplicationWorkspaceViewProps) {
  const applications = getSortedApplications(applicationsById)
  const selectedApplication =
    applicationsById[selectedApplicationId] ?? applications[0]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '230px minmax(0, 1fr)' },
        gap: { xs: 2, md: 2.5 },
        alignItems: 'start',
      }}
    >
      <ApplicationNavigation
        applications={applications}
        environmentStatusesByApplicationId={environmentStatusesByApplicationId}
        selectedApplication={selectedApplication}
      />

      <Box sx={{ minWidth: 0, display: 'grid', gap: '1rem' }}>
        {selectedApplication ? (
          <ApplicationHeader application={selectedApplication} />
        ) : null}

        {children}
      </Box>
    </Box>
  )
}

export function getApplicationEnvironmentStatuses({
  application,
  pendingDeployments,
  releases,
}: {
  application: ApplicationConfig
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
}) {
  const releasesSorted = getSortedReleases(application, releases)
  const newestRelease = releasesSorted[0]

  return Object.fromEntries(
    getEnvironmentNames(application).map((environmentName) => {
      const latestDeployment = getLatestDeploymentForEnvironment({
        application,
        environmentName,
        pendingDeployments,
        releases: releasesSorted,
      })
      const deploymentState = latestDeployment?.deploymentState

      if (deploymentState && failedDeploymentStates.has(deploymentState)) {
        return [environmentName, 'failed']
      }

      if (
        newestRelease &&
        latestDeployment?.release.id === newestRelease.id &&
        deploymentState &&
        upToDateDeploymentStates.has(deploymentState)
      ) {
        return [environmentName, 'up-to-date']
      }

      return [environmentName, 'outdated']
    }),
  ) as Record<string, EnvironmentDeployStatus>
}

function getLatestDeploymentForEnvironment({
  application,
  environmentName,
  pendingDeployments,
  releases,
}: {
  application: ApplicationConfig
  environmentName: string
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
}) {
  for (const release of releases) {
    const pendingDeployment =
      pendingDeployments[
        getDeploymentId({
          environment: environmentName,
          owner: application.repo.owner,
          release: release.tagName,
          repo: application.repo.name,
        })
      ]
    const deployment = getVisibleDeployment(
      release.deployments,
      environmentName,
      pendingDeployment,
    )
    const deploymentState = getDeploymentState({
      deployment,
      pendingDeployment,
    })

    if (deploymentState) {
      return {
        deploymentState,
        release,
      }
    }
  }

  return undefined
}

function getSortedApplications(
  applicationsById: Record<string, ApplicationConfig>,
) {
  return Object.values(applicationsById).sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

function getSortedReleases(
  application: ApplicationConfig,
  releases: ReleaseModel[],
) {
  return orderBy(
    releases
      .slice()
      .sort((a, b) =>
        b.tagName.localeCompare(a.tagName, undefined, { numeric: true }),
      )
      .filter((release) =>
        release.name
          .toLowerCase()
          .startsWith(application.releaseFilter.toLowerCase()),
      ),
    (release) => release.createdAt,
    'desc',
  )
}
