import {
  E2E_REPO,
  E2E_WORKFLOW,
  createPersistedApplication,
  expect,
  test,
} from './githubMocks'

test.describe.configure({ mode: 'serial' })

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
  await expect(
    page.getByRole('link', {
      name: `${E2E_WORKFLOW.name} to ${E2E_REPO.defaultBranch}`,
    })
  ).toBeVisible()
  await expect
    .poll(() => github.restRequests.some((path) => path.endsWith('/runs')))
    .toBe(true)

  const releaseRow = page.getByRole('row', { name: /v1\.2\.3/ })
  await expect(releaseRow).toBeVisible()
  await releaseRow.getByRole('button', { name: 'Deploy' }).click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Deploy v1.2.3 to dev?' })
  ).toBeVisible()
  await expect(dialog.getByText('Version')).toBeVisible()
  await expect(dialog.getByText('v1.2.3', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Environment')).toBeVisible()
  await expect(dialog.getByText('dev', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Repository')).toBeVisible()
  await expect(
    dialog.getByText(`${E2E_REPO.owner}/${E2E_REPO.name}`)
  ).toBeVisible()
  await expect(dialog.getByText('Workflow ref')).toBeVisible()
  await expect(dialog.getByText('main', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText(
      'Production environment detected. Verify the version and target before deploying.'
    )
  ).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Deploy' }).click()

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

test('warns before dispatching a production-like deployment', async ({
  page,
  github,
}) => {
  const application = createPersistedApplication()
  application.environmentSettingsByName = {
    'release-ring': {
      name: 'release-ring',
      workflowInputValue: 'prod',
    },
  }
  await github.seedAuthenticatedState({
    applicationsById: {
      [application.id]: application,
    },
    selectedApplicationId: application.id,
  })

  await page.goto('/')
  await expect
    .poll(() => github.restRequests.some((path) => path.endsWith('/runs')))
    .toBe(true)

  const releaseRow = page.getByRole('row', { name: /v1\.2\.3/ })
  await expect(releaseRow).toBeVisible()
  await releaseRow.getByRole('button', { name: 'Deploy' }).click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', {
      name: 'Deploy v1.2.3 to release-ring?',
    })
  ).toBeVisible()
  await expect(
    dialog.getByText(
      'Production environment detected. Verify the version and target before deploying.'
    )
  ).toBeVisible()
  await expect(dialog.getByText('Workflow input')).toBeVisible()
  await expect(dialog.getByText('prod', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Deploy' }).click()

  await expect.poll(() => github.dispatchRequests.length).toBe(1)
  expect(github.dispatchRequests[0].body.inputs).toEqual({
    ref: 'v1.2.3',
    environment: 'prod',
  })
})
