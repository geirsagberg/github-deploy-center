import {
  E2E_REPO,
  E2E_WORKFLOW,
  createPersistedApplication,
  expect,
  test,
} from './githubMocks'

test('dispatches a mocked workflow and shows a pending deployment', async ({
  page,
  github,
}) => {
  const application = createPersistedApplication()
  await github.seedAuthenticatedState({
    applicationsById: {
      [application.id]: application,
    },
    selectedApplicationId: application.id,
  })

  await page.goto('/')

  const releaseRow = page.getByRole('row', { name: /v1\.2\.3/ })
  await expect(releaseRow).toBeVisible()
  await releaseRow.getByRole('button', { name: 'Deploy' }).click()

  await expect(
    page.getByText(
      `Are you sure you want to deploy "v1.2.3" to "dev" in "${E2E_REPO.owner}/${E2E_REPO.name}@main"?`
    )
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ok' }).click()

  await expect(releaseRow.getByRole('button', { name: 'PENDING' })).toBeVisible()
  await expect.poll(() => github.dispatchRequests.length).toBe(1)

  expect(github.dispatchRequests[0]).toEqual({
    owner: E2E_REPO.owner,
    repo: E2E_REPO.name,
    workflowId: String(E2E_WORKFLOW.id),
    body: {
      ref: 'main',
      inputs: {
        ref: 'v1.2.3',
        environment: 'dev',
      },
    },
  })
})
