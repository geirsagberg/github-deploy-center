import {
  E2E_ACCOUNT_ID,
  FAKE_TOKEN,
  STORAGE_KEY,
  expect,
  test,
} from './githubMocks'

test('first-run setup validates a fake PAT through the mocked GitHub API', async ({
  page,
  github,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Connect GitHub Account' })
  ).toBeVisible()

  const tokenInput = page.getByLabel('Personal access token')
  await expect(tokenInput).toHaveAttribute('type', 'password')

  await tokenInput.fill(FAKE_TOKEN)
  await page.getByRole('button', { name: 'Connect account' }).click()

  await expect(
    page.getByRole('button', { name: /new (application|config)/i })
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
    page.getByRole('heading', { name: 'Connect GitHub Account' })
  ).toBeHidden()
  await expect(
    page.getByRole('button', { name: /new (application|config)/i })
  ).toBeVisible()
  await expect
    .poll(() => github.operationCount('fetchReposWithWriteAccess'))
    .toBeGreaterThanOrEqual(1)
})

test('session-only PAT keeps configuration in local storage', async ({
  page,
  github,
}) => {
  await page.goto('/')

  await page.getByLabel('Personal access token').fill(FAKE_TOKEN)
  await page.getByLabel('Remember token between sessions').uncheck()
  await page.getByRole('button', { name: 'Connect account' }).click()

  await expect(
    page.getByRole('button', { name: /new (application|config)/i })
  ).toBeVisible()

  const saved = await page.evaluate(
    ({ accountId, storageKey }) => {
      const localState = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
      const account = localState.accountsById?.[accountId]

      return {
        localToken: account?.token,
        tokenStorage: account?.tokenStorage,
        sessionToken: sessionStorage.getItem(
          `gdc.v2.session-token.${accountId}`
        ),
      }
    },
    { accountId: E2E_ACCOUNT_ID, storageKey: STORAGE_KEY }
  )

  expect(saved).toEqual({
    localToken: '',
    tokenStorage: 'session',
    sessionToken: FAKE_TOKEN,
  })

  await page.reload()
  await expect(
    page.getByRole('button', { name: /new (application|config)/i })
  ).toBeVisible()
  await expect
    .poll(() => github.operationCount('fetchReposWithWriteAccess'))
    .toBeGreaterThanOrEqual(1)

  await page.evaluate(() => sessionStorage.clear())
  await page.reload()

  await expect(
    page.getByRole('heading', { name: 'Add a personal access token' })
  ).toBeVisible()
  await expect(page.getByLabel('Personal access token')).toHaveAttribute(
    'type',
    'password'
  )

  const persistedAccount = await page.evaluate(
    ({ accountId, storageKey }) => {
      const localState = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
      return localState.accountsById?.[accountId]
    },
    { accountId: E2E_ACCOUNT_ID, storageKey: STORAGE_KEY }
  )

  expect(persistedAccount).toMatchObject({
    token: '',
    tokenStorage: 'session',
    githubLogin: 'e2e-user',
  })
})
