import {
  E2E_ACCOUNT_ID,
  E2E_NON_DISPATCH_WORKFLOW,
  E2E_REPO,
  E2E_WORKFLOW,
  expect,
  test,
} from './githubMocks'

test('creates an application from mocked repositories and saves workflow settings', async ({
  page,
  github,
}) => {
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
    page.getByRole('option', { name: E2E_NON_DISPATCH_WORKFLOW.name })
  ).toHaveCount(0)
  await page.getByRole('option', { name: E2E_WORKFLOW.name }).click()
  await expect(page.getByLabel('Release input name')).toHaveValue(
    'release_version'
  )
  await expect(page.getByLabel('Environment input name (optional)')).toHaveValue(
    'deploy_target'
  )
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
          releaseKey: string
          workflowId: number
        }
      }
    >
  const savedApplication = Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings.workflowId).toBe(E2E_WORKFLOW.id)
  expect(savedApplication?.deploySettings.releaseKey).toBe('release_version')
  expect(savedApplication?.deploySettings.environmentKey).toBe('deploy_target')
})
