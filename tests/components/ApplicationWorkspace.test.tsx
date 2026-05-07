import '../setupDom'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationWorkspaceView } from '../../src/components/ApplicationWorkspace'
import type { ApplicationConfig } from '../../src/state/schemas'
import { actions } from '../../src/store'

const originalActions = {
  editApplication: actions.editApplication,
  exportApplications: actions.exportApplications,
  importApplications: actions.importApplications,
  selectApplication: actions.selectApplication,
  showNewApplicationModal: actions.showNewApplicationModal,
}

afterEach(() => {
  Object.assign(actions, originalActions)
  cleanup()
})

describe('ApplicationWorkspaceView', () => {
  test('switches applications from the app navigation with one click', async () => {
    const selectedApplicationIds: string[] = []
    const user = userEvent.setup()
    actions.selectApplication = (applicationId) =>
      selectedApplicationIds.push(applicationId)

    const { getByLabelText } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
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
    const calledActions: string[] = []
    const user = userEvent.setup()
    actions.editApplication = () => calledActions.push('edit')

    const { getByRole, queryByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    await user.click(getByRole('button', { name: /edit/i }))

    expect(calledActions).toEqual(['edit'])
    expect(queryByRole('button', { name: 'Edit App' })).toBeNull()
    expect(queryByRole('button', { name: 'Edit Deploy' })).toBeNull()
  })

  test('does not show prototype labels', () => {
    const { queryByText } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
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
    const calledActions: string[] = []
    const user = userEvent.setup()
    actions.showNewApplicationModal = () => calledActions.push('new')
    actions.exportApplications = async () => {
      calledActions.push('export')
    }
    actions.importApplications = async () => {
      calledActions.push('import')
    }

    const { getByLabelText, getByRole } = render(
      <ApplicationWorkspaceView
        applicationsById={applicationsById}
        selectedApplicationId="api"
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

    expect(calledActions).toEqual(['new', 'export', 'import'])
  })

  test('shows first-application actions when no applications exist', async () => {
    const calledActions: string[] = []
    const user = userEvent.setup()
    actions.showNewApplicationModal = () => calledActions.push('new')
    actions.exportApplications = async () => {
      calledActions.push('export')
    }
    actions.importApplications = async () => {
      calledActions.push('import')
    }

    const { getByRole, queryByLabelText } = render(
      <ApplicationWorkspaceView
        applicationsById={{}}
        selectedApplicationId=""
      >
        <div>Deployments</div>
      </ApplicationWorkspaceView>
    )

    expect(queryByLabelText('Applications')).toBeNull()
    const emptyState = getByRole('region', {
      name: /add your first deploy config/i,
    })

    await user.click(
      within(emptyState).getByRole('button', {
        name: /^new (application|config)$/i,
      })
    )
    await user.click(
      within(emptyState).getByRole('button', { name: /^import$/i })
    )

    expect(calledActions).toEqual(['new', 'import'])
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
