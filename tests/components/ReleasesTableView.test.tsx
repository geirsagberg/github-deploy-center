import '../setupDom'
import { describe, expect, test } from 'bun:test'
import dayjs from 'dayjs'
import {
  getDeploymentState,
  getVisibleDeployment,
} from '../../src/components/ReleasesTableView'
import { DeploymentState } from '../../src/generated/graphql'
import type { DeploymentModel } from '../../src/store'

const deployment = ({
  id,
  state,
  createdAt,
  modifiedAt = createdAt,
}: {
  id: string
  state: DeploymentState
  createdAt: string
  modifiedAt?: string
}): DeploymentModel => ({
  id,
  createdAt: dayjs(createdAt),
  environment: 'dev',
  state,
  modifiedAt: dayjs(modifiedAt),
})

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
