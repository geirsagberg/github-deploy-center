import '../setupDom'
import { describe, expect, test } from 'bun:test'
import dayjs from 'dayjs'
import {
  getDeploymentState,
  getVisibleDeployment,
  getWorkflowRunLink,
} from '../../src/components/ReleasesTableView'
import { DeploymentState } from '../../src/generated/graphql'
import type { DeploymentModel } from '../../src/store'
import type { RepoModel, WorkflowRun } from '../../src/state/schemas'

const deployment = ({
  id,
  state,
  createdAt,
  modifiedAt = createdAt,
  workflowRunId,
}: {
  id: string
  state: DeploymentState
  createdAt: string
  modifiedAt?: string
  workflowRunId?: number
}): DeploymentModel => ({
  id,
  createdAt: dayjs(createdAt),
  environment: 'dev',
  state,
  modifiedAt: dayjs(modifiedAt),
  workflowRunId,
})

const repo: RepoModel = {
  id: 'repo-1',
  owner: 'octo-org',
  name: 'deploy-center-fixture',
  defaultBranch: 'main',
}

describe('ReleasesTableView deployment state', () => {
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

    const visibleDeployment = getVisibleDeployment(
      [latestInProgress, previousActive],
      'dev',
    )

    expect(visibleDeployment).toBe(previousActive)
    expect(getDeploymentState({ deployment: visibleDeployment })).toBe(
      DeploymentState.Active,
    )
  })

  test('shows transient GitHub deployments when a matching local pending marker exists', () => {
    const latestInProgress = deployment({
      id: 'latest-in-progress',
      state: DeploymentState.InProgress,
      createdAt: '2026-05-01T10:05:00.000Z',
    })
    const pendingDeployment = {
      createdAt: '2026-05-01T10:00:00.000Z',
    }

    const visibleDeployment = getVisibleDeployment(
      [latestInProgress],
      'dev',
      pendingDeployment,
    )

    expect(visibleDeployment).toBe(latestInProgress)
    expect(
      getDeploymentState({
        deployment: visibleDeployment,
        pendingDeployment,
      }),
    ).toBe(DeploymentState.InProgress)
  })

  test('shows local pending before GitHub creates a deployment status', () => {
    expect(
      getDeploymentState({
        pendingDeployment: {
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      }),
    ).toBe(DeploymentState.Pending)
  })
})

describe('ReleasesTableView workflow run links', () => {
  test('falls back to a GitHub Actions run URL when workflow metadata has not loaded yet', () => {
    const latestInProgress = deployment({
      id: 'latest-in-progress',
      state: DeploymentState.InProgress,
      createdAt: '2026-05-01T10:05:00.000Z',
      workflowRunId: 12345,
    })

    expect(
      getWorkflowRunLink({
        deployment: latestInProgress,
        repo,
        workflowRuns: {},
      }),
    ).toEqual({
      href: 'https://github.com/octo-org/deploy-center-fixture/actions/runs/12345',
      label: 'Open workflow run #12345',
      title: 'Workflow run #12345',
    })
  })

  test('uses the pending deployment workflow run id before GitHub creates a deployment status', () => {
    expect(
      getWorkflowRunLink({
        pendingDeployment: {
          createdAt: '2026-05-01T10:00:00.000Z',
          workflowRunId: 23456,
        },
        repo,
        workflowRuns: {},
      }),
    ).toEqual({
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

    expect(
      getWorkflowRunLink({
        deployment: deployment({
          id: 'active',
          state: DeploymentState.Active,
          createdAt: '2026-05-01T10:05:00.000Z',
          workflowRunId: workflowRun.id,
        }),
        repo,
        workflowRuns: {
          [workflowRun.id]: workflowRun,
        },
      }),
    ).toEqual({
      href: workflowRun.html_url,
      label: 'Open Deploy fixture app #82',
      title: 'Deploy fixture app #82',
      conclusion: 'success',
    })
  })
})
