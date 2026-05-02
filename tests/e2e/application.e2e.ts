import {
  E2E_ACCOUNT_ID,
  E2E_DYNAMIC_WORKFLOW,
  E2E_NON_DEPLOY_WORKFLOW,
  E2E_REPO,
  E2E_WORKFLOW,
  expect,
  test,
} from './githubMocks'

test('creates an application from mocked repositories and saves workflow settings', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  await github.seedAuthenticatedState()

  await page.goto('/')
  await page.getByRole('button', { name: 'New application' }).click()

  await page.getByLabel('Find repository').fill(E2E_REPO.name)
  await page.getByRole('option', { name: E2E_REPO.name }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(
    page.getByRole('heading', { name: 'Deploy workflow settings' })
  ).toBeVisible()
  await page.locator('#workflow-select').click()
  await expect(
    page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name })
  ).toHaveCount(0)
  await expect(
    page.getByRole('option', { name: E2E_DYNAMIC_WORKFLOW.name })
  ).toHaveCount(0)
  await page.getByRole('option', { name: E2E_WORKFLOW.name }).click()
  await expect(page.getByLabel('Release input name')).toHaveValue(
    'release_version'
  )
  await expect(page.getByLabel('Environment input name (optional)')).toHaveValue(
    'deploy_target'
  )
  await expect
    .poll(() =>
      github.restRequests.some((request) => request.includes('/environments'))
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(
    page.getByRole('link', {
      name: `${E2E_WORKFLOW.name} to ${E2E_REPO.defaultBranch}`,
    })
  ).toBeVisible()

  const persisted = await github.readPersistedState()
  const applications = persisted.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as Record<
      string,
      {
        name: string
        deploySettings: {
          environmentKey: string
          manualWorkflowHandling: boolean
          releaseKey: string
          workflowId: number
        }
        environmentSettingsByName: Record<string, unknown>
      }
    >
  const savedApplication = Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings.workflowId).toBe(E2E_WORKFLOW.id)
  expect(savedApplication?.deploySettings.releaseKey).toBe('release_version')
  expect(savedApplication?.deploySettings.environmentKey).toBe('deploy_target')
  expect(savedApplication?.deploySettings.manualWorkflowHandling).toBe(false)
  expect(
    Object.keys(savedApplication?.environmentSettingsByName ?? {})
  ).toEqual(['dev', 'test', 'tst', 'qa', 'staging', 'sandbox', 'prod'])
  expect(github.restRequests.some((request) => request.includes('dynamic'))).toBe(
    false
  )

  const environmentHeaders = page.locator('thead a')
  await expect(environmentHeaders).toHaveText([
    'dev',
    'test',
    'tst',
    'qa',
    'staging',
    'sandbox',
    'prod',
  ])
  await page
    .getByLabel('Move prod')
    .dragTo(page.locator('thead th').filter({ hasText: 'test' }))
  await expect(environmentHeaders).toHaveText([
    'dev',
    'prod',
    'test',
    'tst',
    'qa',
    'staging',
    'sandbox',
  ])

  const reordered = await github.readPersistedState()
  const reorderedApplications = reordered.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as typeof applications
  const reorderedApplication = Object.values(reorderedApplications).find(
    (application) => application.name === E2E_REPO.name
  )
  expect(
    Object.keys(reorderedApplication?.environmentSettingsByName ?? {})
  ).toEqual(['dev', 'prod', 'test', 'tst', 'qa', 'staging', 'sandbox'])
})

test('falls back to file-backed workflows when smart inspection cannot infer deploy workflows', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  github.failWorkflowFile(E2E_WORKFLOW.path)
  await github.seedAuthenticatedState()

  await page.goto('/')
  await page.getByRole('button', { name: 'New application' }).click()

  await page.getByLabel('Find repository').fill(E2E_REPO.name)
  await page.getByRole('option', { name: E2E_REPO.name }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(
    page.getByRole('heading', { name: 'Deploy workflow settings' })
  ).toBeVisible()
  await page.locator('#workflow-select').click()
  await expect(
    page.getByRole('option', { name: E2E_WORKFLOW.name })
  ).toBeVisible()
  await expect(
    page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name })
  ).toBeVisible()
  await expect(
    page.getByRole('option', { name: E2E_DYNAMIC_WORKFLOW.name })
  ).toHaveCount(0)
  await page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name }).click()
  await expect(page.getByLabel('Release input name')).toHaveValue('ref')
  await expect(page.getByLabel('Environment input name (optional)')).toHaveValue(
    'environment'
  )
  await page.getByRole('button', { name: 'Save' }).click()

  const persisted = await github.readPersistedState()
  const applications = persisted.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as Record<
      string,
      {
        name: string
        deploySettings: {
          environmentKey: string
          manualWorkflowHandling: boolean
          releaseKey: string
          workflowId: number
        }
      }
    >
  const savedApplication = Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings.workflowId).toBe(
    E2E_NON_DEPLOY_WORKFLOW.id
  )
  expect(savedApplication?.deploySettings.releaseKey).toBe('ref')
  expect(savedApplication?.deploySettings.environmentKey).toBe('environment')
  expect(savedApplication?.deploySettings.manualWorkflowHandling).toBe(false)
})

test('manual workflow setup shows all workflows and disables inference', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  await github.seedAuthenticatedState()

  await page.goto('/')
  await page.getByRole('button', { name: 'New application' }).click()

  await page.getByLabel('Find repository').fill(E2E_REPO.name)
  await page.getByRole('option', { name: E2E_REPO.name }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(
    page.getByRole('heading', { name: 'Deploy workflow settings' })
  ).toBeVisible()
  await page.getByLabel('Manual', { exact: true }).hover()
  await expect(
    page.getByText('Show all workflows and enter input names manually.')
  ).toBeVisible()
  await page.getByLabel('Manual', { exact: true }).check()
  await page.locator('#workflow-select').click()
  await expect(
    page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name })
  ).toBeVisible()
  await expect(
    page.getByRole('option', { name: E2E_DYNAMIC_WORKFLOW.name })
  ).toHaveCount(0)
  await page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name }).click()
  await expect(page.getByLabel('Release input name')).toHaveValue('ref')
  await expect(page.getByLabel('Environment input name (optional)')).toHaveValue(
    'environment'
  )
  await page.getByRole('button', { name: 'Save' }).click()

  const persisted = await github.readPersistedState()
  const applications = persisted.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as Record<
      string,
      {
        name: string
        deploySettings: {
          environmentKey: string
          manualWorkflowHandling: boolean
          releaseKey: string
          workflowId: number
        }
      }
    >
  const savedApplication = Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings.workflowId).toBe(
    E2E_NON_DEPLOY_WORKFLOW.id
  )
  expect(savedApplication?.deploySettings.releaseKey).toBe('ref')
  expect(savedApplication?.deploySettings.environmentKey).toBe('environment')
  expect(savedApplication?.deploySettings.manualWorkflowHandling).toBe(true)

  await page.getByRole('button', { name: 'Edit Deploy' }).click()
  await expect(page.getByLabel('Manual', { exact: true })).toBeChecked()
})
