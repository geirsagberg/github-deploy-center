import {
  E2E_ACCOUNT_ID,
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
  await page.getByRole('option', { name: E2E_WORKFLOW.name }).click()
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
    { name: string; deploySettings: { workflowId: number } }
  >
  const savedApplication = Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings.workflowId).toBe(E2E_WORKFLOW.id)
})
