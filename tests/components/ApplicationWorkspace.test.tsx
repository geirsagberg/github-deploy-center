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
        showNewApplicationModal={() => {}}
        selectApplication={(applicationId) =>
          selectedApplicationIds.push(applicationId)
        }
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
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

  test('opens merged app and deploy settings from one edit action', async () => {
    const actions: string[] = []
    const user = userEvent.setup()

    const { getByRole, queryByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => actions.push('edit')}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    await user.click(getByRole('button', { name: /edit/i }))

    expect(actions).toEqual(['edit'])
    expect(queryByRole('button', { name: 'Edit App' })).toBeNull()
    expect(queryByRole('button', { name: 'Edit Deploy' })).toBeNull()
  })

  test('does not show prototype labels', () => {
    const { queryByText } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    expect(queryByText('Sidebar')).toBeNull()
    expect(queryByText('Active application')).toBeNull()
  })

  test('links the selected repo and branch label to GitHub', () => {
    const slashBranchApplications = {
      api: createApplication({
        id: 'api',
        name: 'API',
        owner: 'deploy-center',
        repo: 'api',
        environments: ['test'],
        ref: 'release/2026.05',
      }),
    }

    const { getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={slashBranchApplications}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const repoBranchLink = getByRole('link', {
      name: 'deploy-center/api on release/2026.05',
    })

    expect(repoBranchLink.getAttribute('href')).toBe(
      'https://github.com/deploy-center/api/tree/release%2F2026.05'
    )
    expect(repoBranchLink.getAttribute('target')).toBe('_blank')
    expect(within(repoBranchLink).getByText('open_in_new')).toBeTruthy()
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
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const apiButton = getByRole('button', { name: /switch to api/i })
    expect(within(apiButton).queryByText('deploy-center')).toBeNull()

    await user.hover(getByLabelText('prod is failed'))

    expect(await findByText('prod: failed')).toBeTruthy()
  })

  test('shows selected application custom arg values as labels', () => {
    const customArgApplications = {
      api: createApplication({
        id: 'api',
        name: 'API',
        owner: 'deploy-center',
        repo: 'api',
        environments: ['test'],
        extraArgs: {
          dry_run: 'true',
          region: 'eu-west-1',
        },
      }),
    }

    const { getByLabelText } = render(
      <ApplicationWorkspaceView
        applicationsById={customArgApplications}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const customArgs = getByLabelText('Custom workflow args')

    expect(within(customArgs).getByText('dry_run=true')).toBeTruthy()
    expect(within(customArgs).getByText('region=eu-west-1')).toBeTruthy()
  })

  test('shows custom arg indicators in app navigation with names in the tooltip', async () => {
    const user = userEvent.setup()
    const customArgApplications = {
      api: applicationsById.api,
      checkout: createApplication({
        id: 'checkout',
        name: 'Checkout',
        owner: 'deploy-center',
        repo: 'checkout',
        environments: ['staging', 'prod'],
        extraArgs: {
          dry_run: 'true',
          region: 'eu-west-1',
        },
      }),
    }

    const { findByText, getByRole, queryByText } = render(
      <ApplicationWorkspaceView
        applicationsById={customArgApplications}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const checkoutButton = getByRole('button', { name: /switch to checkout/i })
    const customArgsIndicator = within(checkoutButton).getByLabelText(
      '2 custom workflow args'
    )

    await user.hover(customArgsIndicator)

    expect(
      await findByText('2 custom workflow args: dry_run, region')
    ).toBeTruthy()
    expect(queryByText('dry_run=true')).toBeNull()
    expect(queryByText('region=eu-west-1')).toBeNull()
  })

  test('does not show a custom args indicator for applications without custom args', () => {
    const { getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        showNewApplicationModal={() => {}}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => {}}
        importApplications={() => {}}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const checkoutButton = getByRole('button', { name: /switch to checkout/i })

    expect(
      within(checkoutButton).queryByLabelText(/custom workflow args/i)
    ).toBeNull()
  })

  test('puts new application and import/export actions at the top of the sidebar', async () => {
    const actions: string[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
        showNewApplicationModal={() => actions.push('new')}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => actions.push('export')}
        importApplications={() => actions.push('import')}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const sidebar = getByLabelText('Applications')
    const newApplicationButton = within(sidebar).getByRole('button', {
      name: /new (application|config)/i,
    })
    const firstApplicationButton = within(sidebar).getByRole('button', {
      name: /switch to api/i,
    })

    expect(
      !!(
        newApplicationButton.compareDocumentPosition(firstApplicationButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true)

    await user.click(newApplicationButton)
    await user.click(
      within(sidebar).getByRole('button', { name: /application actions/i })
    )
    await user.click(getByRole('menuitem', { name: /export/i }))
    await user.click(
      within(sidebar).getByRole('button', { name: /application actions/i })
    )
    await user.click(getByRole('menuitem', { name: /import/i }))

    expect(actions).toEqual(['new', 'export', 'import'])
  })

  test('keeps new application available when no applications exist', async () => {
    const actions: string[] = []
    const user = userEvent.setup()

    const { getByLabelText, getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={{}}
        selectedApplicationId=""
        showNewApplicationModal={() => actions.push('new')}
        selectApplication={() => {}}
        editApplication={() => {}}
        exportApplications={() => actions.push('export')}
        importApplications={() => actions.push('import')}
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    const sidebar = getByLabelText('Applications')
    await user.click(
      within(sidebar).getByRole('button', { name: /new (application|config)/i })
    )
    await user.click(
      within(sidebar).getByRole('button', { name: /application actions/i })
    )
    await user.click(getByRole('menuitem', { name: /import/i }))

    expect(actions).toEqual(['new', 'import'])
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
  ref = 'main',
  repo,
  extraArgs = {},
}: {
  environments: string[]
  extraArgs?: Record<string, string>
  id: string
  name: string
  owner: string
  ref?: string
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
      ref,
      extraArgs,
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
