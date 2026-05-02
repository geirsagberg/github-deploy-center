import { FAKE_TOKEN, expect, test } from './githubMocks'

test('first-run setup validates a fake PAT through the mocked GitHub API', async ({
  page,
  github,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Add your GitHub account' })
  ).toBeVisible()

  const tokenInput = page.getByLabel('Personal access token')
  await expect(tokenInput).toHaveAttribute('type', 'password')

  await tokenInput.fill(FAKE_TOKEN)
  await page.getByRole('button', { name: 'Add account' }).click()

  await expect(
    page.getByRole('button', { name: 'New application' })
  ).toBeVisible()
  expect(github.operationCount('githubIdentity')).toBe(1)
  await expect
    .poll(() => github.operationCount('fetchReposWithWriteAccess'))
    .toBeGreaterThanOrEqual(1)
})

test('authenticated state skips setup and preloads repositories', async ({
  page,
  github,
}) => {
  await github.seedAuthenticatedState()

  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Add your GitHub account' })
  ).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'New application' })
  ).toBeVisible()
  await expect
    .poll(() => github.operationCount('fetchReposWithWriteAccess'))
    .toBeGreaterThanOrEqual(1)
})
