import { describe, expect, test } from 'bun:test'
import dayjs from 'dayjs'
import {
  getEnvironmentStatuses,
  projectDeploymentMatrix,
} from '../../src/state/deploymentMatrix'
import { DeploymentState } from '../../src/generated/graphql'
import type {
  ApplicationConfig,
  RepoModel,
  WorkflowRun,
} from '../../src/state/schemas'
import type { DeploymentModel, ReleaseModel } from '../../src/store'

const repo: RepoModel = {
  id: 'repo-1',
  owner: 'octo-org',
  name: 'deploy-center-fixture',
  defaultBranch: 'main',
}

describe('deployment matrix target projection', () => {
  test('skips transient GitHub deployments without a matching local pending marker', () => {
    const latestInProgress = deployment({
      id: 'latest-in-progress',
      state: DeploymentState.InProgress,
      createdAt: '2026-05-01T10:05:00.000Z',
    })
    const previousActive = deployment({
      id: 'previous-active',
      state: DeploymentState.Active,
      createdAt: '2026-05-01T09:00:00.000Z',
    })
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {},
      releases: [
        release({
          id: 'v1',
          deployments: [latestInProgress, previousActive],
        }),
      ],
    })
    const target = matrix.targetsByReleaseId.v1.dev

    expect(target.deployment).toBe(previousActive)
    expect(target.state).toBe(DeploymentState.Active)
  })

  test('shows transient GitHub deployments when a matching local pending marker exists', () => {
    const latestInProgress = deployment({
      id: 'latest-in-progress',
      state: DeploymentState.InProgress,
      createdAt: '2026-05-01T10:05:00.000Z',
    })
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {
        'octo-org/deploy-center-fixture/dev/v1': {
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      },
      releases: [
        release({
          id: 'v1',
          deployments: [latestInProgress],
        }),
      ],
    })
    const target = matrix.targetsByReleaseId.v1.dev

    expect(target.deployment).toBe(latestInProgress)
    expect(target.state).toBe(DeploymentState.InProgress)
  })

  test('shows local pending before GitHub creates a deployment status', () => {
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {
        'octo-org/deploy-center-fixture/dev/v1': {
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      },
      releases: [
        release({
          id: 'v1',
          deployments: [],
        }),
      ],
    })

    expect(matrix.targetsByReleaseId.v1.dev.state).toBe(
      DeploymentState.Pending,
    )
  })
})

describe('deployment matrix workflow run links', () => {
  test('falls back to a GitHub Actions run URL when workflow metadata has not loaded yet', () => {
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {},
      releases: [
        release({
          id: 'v1',
          deployments: [
            deployment({
              id: 'active',
              state: DeploymentState.Active,
              createdAt: '2026-05-01T10:05:00.000Z',
              workflowRunId: 12345,
            }),
          ],
        }),
      ],
      workflowRuns: {},
    })

    expect(matrix.targetsByReleaseId.v1.dev.workflowRunLink).toEqual({
      href: 'https://github.com/octo-org/deploy-center-fixture/actions/runs/12345',
      label: 'Open workflow run #12345',
      title: 'Workflow run #12345',
    })
  })

  test('uses the pending deployment workflow run id before GitHub creates a deployment status', () => {
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {
        'octo-org/deploy-center-fixture/dev/v1': {
          createdAt: '2026-05-01T10:00:00.000Z',
          workflowRunId: 23456,
        },
      },
      releases: [
        release({
          id: 'v1',
          deployments: [],
        }),
      ],
      workflowRuns: {},
    })

    expect(matrix.targetsByReleaseId.v1.dev.workflowRunLink).toEqual({
      href: 'https://github.com/octo-org/deploy-center-fixture/actions/runs/23456',
      label: 'Open workflow run #23456',
      title: 'Workflow run #23456',
    })
  })

  test('keeps the richer workflow run link when workflow metadata is available', () => {
    const workflowRun: WorkflowRun = {
      id: 34567,
      name: 'Deploy fixture app',
      status: 'completed',
      created_at: '2026-05-01T10:01:00.000Z',
      conclusion: 'success',
      run_number: 82,
      html_url:
        'https://github.com/octo-org/deploy-center-fixture/actions/runs/34567?check_suite_focus=true',
    }
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev'] }),
      pendingDeployments: {},
      releases: [
        release({
          id: 'v1',
          deployments: [
            deployment({
              id: 'active',
              state: DeploymentState.Active,
              createdAt: '2026-05-01T10:05:00.000Z',
              workflowRunId: workflowRun.id,
            }),
          ],
        }),
      ],
      workflowRuns: {
        [workflowRun.id]: workflowRun,
      },
    })

    expect(matrix.targetsByReleaseId.v1.dev.workflowRunLink).toEqual({
      href: workflowRun.html_url,
      label: 'Open Deploy fixture app #82',
      title: 'Deploy fixture app #82',
      conclusion: 'success',
    })
  })
})

describe('deployment matrix environment summaries', () => {
  test('marks environments as up to date, outdated, or failed', () => {
    const matrix = projectDeploymentMatrix({
      application: createApplication({ environments: ['dev', 'qa', 'prod'] }),
      pendingDeployments: {},
      releases: [
        release({
          id: 'v2',
          createdAt: '2026-05-02T10:00:00.000Z',
          deployments: [
            deployment({
              environment: 'dev',
              id: 'v2-dev',
              state: DeploymentState.Active,
            }),
            deployment({
              environment: 'prod',
              id: 'v2-prod',
              state: DeploymentState.Failure,
            }),
          ],
        }),
        release({
          id: 'v1',
          createdAt: '2026-05-01T10:00:00.000Z',
          deployments: [
            deployment({
              environment: 'qa',
              id: 'v1-qa',
              state: DeploymentState.Active,
            }),
          ],
        }),
      ],
    })

    expect(getEnvironmentStatuses(matrix)).toEqual({
      dev: 'up-to-date',
      prod: 'failed',
      qa: 'outdated',
    })
  })
})

function createApplication({
  environments,
  releaseFilter = '',
}: {
  environments: string[]
  releaseFilter?: string
}): ApplicationConfig {
  return {
    id: 'app',
    name: 'Fixture',
    releaseFilter,
    repo,
    deploySettings: {
      type: 'workflow',
      environmentKey: 'environment',
      releaseKey: 'ref',
      workflowId: 1,
      ref: 'main',
      extraArgs: {},
      manualWorkflowHandling: false,
    },
    environmentSettingsByName: Object.fromEntries(
      environments.map((environment) => [
        environment,
        { name: environment, workflowInputValue: environment },
      ]),
    ),
  }
}

function release({
  createdAt = '2026-05-01T10:00:00.000Z',
  deployments,
  id,
}: {
  createdAt?: string
  deployments: DeploymentModel[]
  id: string
}): ReleaseModel {
  return {
    id,
    name: id,
    tagName: id,
    createdAt: dayjs(createdAt),
    commit: `commit-${id}`,
    deployments,
  }
}

function deployment({
  createdAt = '2026-05-02T10:00:00.000Z',
  environment = 'dev',
  id,
  modifiedAt = createdAt,
  state,
  workflowRunId,
}: {
  createdAt?: string
  environment?: string
  id: string
  modifiedAt?: string
  state: DeploymentState
  workflowRunId?: number
}): DeploymentModel {
  return {
    id,
    createdAt: dayjs(createdAt),
    environment,
    modifiedAt: dayjs(modifiedAt),
    state,
    workflowRunId,
  }
}
