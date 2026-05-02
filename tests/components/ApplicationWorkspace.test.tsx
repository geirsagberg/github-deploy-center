import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import {
  ApplicationWorkspaceView,
  getApplicationEnvironmentStatuses,
} from '../../src/components/ApplicationWorkspace'
import { DeploymentState } from '../../src/generated/graphql'
import type { ApplicationConfig } from '../../src/state/schemas'
import type { DeploymentModel, ReleaseModel } from '../../src/store'

afterEach(() => {
  cleanup()
})

describe('ApplicationWorkspaceView', () => {
  test('switches applications from the app navigation with one click', async () => {
    const selectedApplicationIds: string[] = []
    const user = userEvent.setup()

    const { getByLabelText } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        selectApplication={(applicationId) =>
          selectedApplicationIds.push(applicationId)
        }
        editApplication={() => {}}
        editDeployment={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    await user.click(
      within(getByLabelText('Applications')).getByRole('button', {
        name: /switch to checkout/i,
      })
    )

    expect(selectedApplicationIds).toEqual(['checkout'])
  })

  test('keeps application and deploy edit actions available', async () => {
    const actions: string[] = []
    const user = userEvent.setup()

    const { getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        selectApplication={() => {}}
        editApplication={() => actions.push('app')}
        editDeployment={() => actions.push('deploy')}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    await user.click(getByRole('button', { name: 'Edit App' }))
    await user.click(getByRole('button', { name: 'Edit Deploy' }))

    expect(actions).toEqual(['app', 'deploy'])
  })

  test('does not show prototype labels', () => {
    const { queryByText } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        selectApplication={() => {}}
        editApplication={() => {}}
        editDeployment={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    expect(queryByText('Sidebar')).toBeNull()
    expect(queryByText('Active application')).toBeNull()
  })

  test('shows environment status chips with tooltips instead of the repo owner', async () => {
    const user = userEvent.setup()

    const { findByText, getByLabelText, getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        environmentStatusesByApplicationId={{
          api: {
            prod: 'failed',
            test: 'up-to-date',
          },
        }}
        selectedApplicationId="api"
        selectApplication={() => {}}
        editApplication={() => {}}
        editDeployment={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const apiButton = getByRole('button', { name: /switch to api/i })
    expect(within(apiButton).queryByText('deploy-center')).toBeNull()

    await user.hover(getByLabelText('prod is failed'))

    expect(await findByText('prod: failed')).toBeTruthy()
  })
})

describe('getApplicationEnvironmentStatuses', () => {
  test('marks environments as up to date, outdated, or failed', () => {
    const application = createApplication({
      id: 'api',
      name: 'API',
      owner: 'deploy-center',
      repo: 'api',
      environments: ['dev', 'qa', 'prod'],
    })

    expect(
      getApplicationEnvironmentStatuses({
        application,
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
    ).toEqual({
      dev: 'up-to-date',
      prod: 'failed',
      qa: 'outdated',
    })
  })
})

const applicationsById: Record<string, ApplicationConfig> = {
  api: createApplication({
    id: 'api',
    name: 'API',
    owner: 'deploy-center',
    repo: 'api',
    environments: ['test', 'prod'],
  }),
  checkout: createApplication({
    id: 'checkout',
    name: 'Checkout',
    owner: 'deploy-center',
    repo: 'checkout',
    environments: ['staging', 'prod'],
  }),
  storefront: createApplication({
    id: 'storefront',
    name: 'Storefront',
    owner: 'deploy-center',
    repo: 'storefront',
    environments: ['dev', 'prod'],
  }),
}

function createApplication({
  environments,
  id,
  name,
  owner,
  repo,
}: {
  environments: string[]
  id: string
  name: string
  owner: string
  repo: string
}): ApplicationConfig {
  return {
    id,
    name,
    releaseFilter: '',
    repo: {
      id: `repo-${id}`,
      name: repo,
      owner,
      defaultBranch: 'main',
    },
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
      ])
    ),
  }
}

function release({
  createdAt,
  deployments,
  id,
}: {
  createdAt: string
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
  environment,
  id,
  state,
}: {
  environment: string
  id: string
  state: DeploymentState
}): DeploymentModel {
  return {
    id,
    createdAt: dayjs('2026-05-02T10:00:00.000Z'),
    environment,
    modifiedAt: dayjs('2026-05-02T10:00:00.000Z'),
    state,
  }
}
