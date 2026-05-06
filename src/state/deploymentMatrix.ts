import dayjs from 'dayjs'
import { orderBy } from 'lodash-es'
import { DeploymentState } from '../generated/graphql'
import { getDeploymentId } from '../store/utils'
import type { DeploymentModel, ReleaseModel } from '../store/state'
import type {
  ApplicationConfig,
  EnvironmentSettings,
  PendingDeployment,
  RepoModel,
  WorkflowRun,
} from './schemas'

export type EnvironmentDeployStatus = 'up-to-date' | 'outdated' | 'failed'

export type EnvironmentStatusesByApplicationId = Record<
  string,
  Record<string, EnvironmentDeployStatus>
>

export type WorkflowRunLink = {
  href: string
  label: string
  title: string
  conclusion?: WorkflowRun['conclusion']
}

export type EnvironmentDeploymentSummary = {
  name: string
  status: EnvironmentDeployStatus
  latestRelease?: ReleaseModel
}

export type DeploymentTarget = {
  deployment?: DeploymentModel
  environment: EnvironmentSettings
  isAfterLatestDeployment: boolean
  pendingDeployment?: PendingDeployment
  release: ReleaseModel
  state?: DeploymentState
  workflowRunLink?: WorkflowRunLink
}

export type DeploymentMatrix = {
  application: ApplicationConfig
  environments: EnvironmentDeploymentSummary[]
  releases: ReleaseModel[]
  targetsByReleaseId: Record<string, Record<string, DeploymentTarget>>
}

export function projectDeploymentMatrix({
  application,
  pendingDeployments,
  releases,
  workflowRuns = {},
}: {
  application: ApplicationConfig
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
  workflowRuns?: Record<number, WorkflowRun>
}): DeploymentMatrix {
  const sortedReleases = sortApplicationReleases(application, releases)
  const environments = Object.values(application.environmentSettingsByName)
  const latestReleaseByEnvironment = getLatestReleaseByEnvironment({
    application,
    environments,
    pendingDeployments,
    releases: sortedReleases,
  })
  const targetsByReleaseId = Object.fromEntries(
    sortedReleases.map((release) => [
      release.id,
      Object.fromEntries(
        environments.map((environment) => {
          const pendingDeployment = getPendingDeployment({
            application,
            environmentName: environment.name,
            pendingDeployments,
            release,
          })
          const deployment = getVisibleDeployment(
            release.deployments,
            environment.name,
            pendingDeployment,
          )
          const state = getDeploymentState({ deployment, pendingDeployment })
          const latestRelease = latestReleaseByEnvironment[environment.name]

          return [
            environment.name,
            {
              deployment,
              environment,
              isAfterLatestDeployment:
                !latestRelease ||
                release.createdAt.isAfter(latestRelease.createdAt),
              pendingDeployment,
              release,
              state,
              workflowRunLink: getWorkflowRunLink({
                deployment,
                pendingDeployment,
                repo: application.repo,
                workflowRuns,
              }),
            },
          ]
        }),
      ),
    ]),
  )

  return {
    application,
    environments: environments.map((environment) => {
      const latestTarget = sortedReleases
        .map((release) => targetsByReleaseId[release.id][environment.name])
        .find((target) => target.state)

      return {
        name: environment.name,
        status: getEnvironmentDeployStatus(
          latestTarget,
          sortedReleases[0],
        ),
        latestRelease: latestTarget?.release,
      }
    }),
    releases: sortedReleases,
    targetsByReleaseId,
  }
}

export function getEnvironmentStatuses(matrix: DeploymentMatrix) {
  return Object.fromEntries(
    matrix.environments.map((environment) => [
      environment.name,
      environment.status,
    ]),
  ) as Record<string, EnvironmentDeployStatus>
}

function getWorkflowRunLink({
  deployment,
  pendingDeployment,
  repo,
  workflowRuns,
}: {
  deployment?: Pick<DeploymentModel, 'workflowRunId'>
  pendingDeployment?: PendingDeployment
  repo?: RepoModel
  workflowRuns: Record<number, WorkflowRun>
}): WorkflowRunLink | undefined {
  const workflowRunId =
    deployment?.workflowRunId ?? pendingDeployment?.workflowRunId

  if (!workflowRunId) return undefined

  const workflowRun = workflowRuns[workflowRunId]

  if (workflowRun) {
    const title = `${workflowRun.name} #${workflowRun.run_number}`
    return {
      href: workflowRun.html_url,
      label: `Open ${title}`,
      title,
      conclusion: workflowRun.conclusion,
    }
  }

  if (!repo) return undefined

  const title = `Workflow run #${workflowRunId}`
  return {
    href: `https://github.com/${repo.owner}/${repo.name}/actions/runs/${workflowRunId}`,
    label: `Open ${title.toLowerCase()}`,
    title,
  }
}

function getVisibleDeployment(
  deployments: DeploymentModel[],
  environmentName: string,
  pendingDeployment?: PendingDeployment,
) {
  return deployments.find(
    (deployment) =>
      deployment.environment === environmentName &&
      (!!pendingDeployment || !isTransientDeploymentState(deployment.state)),
  )
}

function getDeploymentState({
  deployment,
  pendingDeployment,
}: {
  deployment?: DeploymentModel
  pendingDeployment?: PendingDeployment
}) {
  const modifiedAt = deployment?.modifiedAt

  if (
    pendingDeployment &&
    (!modifiedAt || dayjs(pendingDeployment.createdAt).isAfter(modifiedAt))
  ) {
    return DeploymentState.Pending
  }

  if (!pendingDeployment && isTransientDeploymentState(deployment?.state)) {
    return undefined
  }

  return deployment?.state
}

function sortApplicationReleases(
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

function getLatestReleaseByEnvironment({
  application,
  environments,
  pendingDeployments,
  releases,
}: {
  application: ApplicationConfig
  environments: EnvironmentSettings[]
  pendingDeployments: Record<string, PendingDeployment>
  releases: ReleaseModel[]
}) {
  const remainingEnvironmentNames = new Set(
    environments.map((environment) => environment.name),
  )
  const latestReleaseByEnvironment: Record<string, ReleaseModel> = {}

  for (const release of releases) {
    if (remainingEnvironmentNames.size === 0) break

    for (const environment of environments) {
      if (!remainingEnvironmentNames.has(environment.name)) continue

      const pendingDeployment = getPendingDeployment({
        application,
        environmentName: environment.name,
        pendingDeployments,
        release,
      })
      const deployment = getVisibleDeployment(
        release.deployments,
        environment.name,
        pendingDeployment,
      )

      if (!pendingDeployment && !deployment) continue

      latestReleaseByEnvironment[environment.name] = release
      remainingEnvironmentNames.delete(environment.name)
      if (remainingEnvironmentNames.size === 0) break
    }
  }

  return latestReleaseByEnvironment
}

function getPendingDeployment({
  application,
  environmentName,
  pendingDeployments,
  release,
}: {
  application: ApplicationConfig
  environmentName: string
  pendingDeployments: Record<string, PendingDeployment>
  release: ReleaseModel
}) {
  return pendingDeployments[
    getDeploymentId({
      release: release.tagName,
      environment: environmentName,
      repo: application.repo.name,
      owner: application.repo.owner,
    })
  ]
}

function getEnvironmentDeployStatus(
  latestTarget: DeploymentTarget | undefined,
  newestRelease: ReleaseModel | undefined,
): EnvironmentDeployStatus {
  if (
    latestTarget?.state &&
    failedDeploymentStates.has(latestTarget.state)
  ) {
    return 'failed'
  }

  if (
    newestRelease &&
    latestTarget?.release.id === newestRelease.id &&
    latestTarget.state &&
    upToDateDeploymentStates.has(latestTarget.state)
  ) {
    return 'up-to-date'
  }

  return 'outdated'
}

const transientDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Pending,
  DeploymentState.InProgress,
  DeploymentState.Queued,
  DeploymentState.Waiting,
])

const failedDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Abandoned,
  DeploymentState.Error,
  DeploymentState.Failure,
])

const upToDateDeploymentStates = new Set<DeploymentState>([
  DeploymentState.Active,
  DeploymentState.Success,
])

const isTransientDeploymentState = (state?: DeploymentState) =>
  !!state && transientDeploymentStates.has(state)
