import {
  E2E_ACCOUNT_ID,
  E2E_DYNAMIC_WORKFLOW,
  E2E_NON_DEPLOY_WORKFLOW,
  E2E_REPO,
  E2E_WORKFLOW,
  createPersistedApplication,
  expect,
  test,
} from './githubMocks'
import type { Page } from '@playwright/test'

type SavedApplication = {
  name: string
  deploySettings: {
    environmentKey: string
    manualWorkflowHandling: boolean
    releaseKey: string
    workflowId: number
  }
  environmentSettingsByName: Record<string, unknown>
}

test('creates an application and persists selected workflow settings', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  await github.seedAuthenticatedState()

  await page.goto('/')
  await openNewApplicationDialog(page)

  await expect(
    page.getByRole('heading', { name: 'Deploy workflow settings' })
  ).toBeVisible()
  await expect(page.getByLabel('Release input name')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

  await selectRepo(page)
  await expect(applicationNameInput(page)).toHaveValue(E2E_REPO.name)
  await expect(page.getByLabel('Release input name')).toBeEnabled()

  await openWorkflowSelect(page)
  await expect(
    page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name })
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

  const savedApplication = await readSavedApplication(github)

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings).toMatchObject({
    environmentKey: 'deploy_target',
    manualWorkflowHandling: false,
    releaseKey: 'release_version',
    workflowId: E2E_WORKFLOW.id,
  })

  const environmentNames = Object.keys(
    savedApplication?.environmentSettingsByName ?? {}
  )
  expect(environmentNames).toContain('prod')
  expect(environmentNames).not.toContain('github-pages')
  expect(environmentNames).not.toContain('uidp-ops')
  expect(savedApplication?.environmentSettingsByName).toMatchObject({
    prod: {
      name: 'prod',
      workflowInputValue: '',
    },
    'uidp-dev': {
      name: 'uidp-dev',
      workflowInputValue: 'dev',
    },
    'uidp-prod': {
      name: 'uidp-prod',
      workflowInputValue: 'prod',
    },
  })
})

test('maps workflow choice values when adding an environment', async ({
  page,
  github,
}) => {
  const application = createPersistedApplicationWithChoiceWorkflow()
  await github.seedAuthenticatedState({
    applicationsById: { [application.id]: application },
    selectedApplicationId: application.id,
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Add environment' }).click()
  await page
    .getByRole('combobox', { name: 'Find or add environment' })
    .fill('uidp-dev')

  await expect(
    page.getByLabel('Workflow input value (defaults to environment name)')
  ).toHaveValue('dev')
  await page.getByRole('button', { name: 'Save' }).click()

  const savedApplication = await readPersistedApplication(
    github,
    application.id
  )

  expect(savedApplication?.environmentSettingsByName).toMatchObject({
    'uidp-dev': {
      name: 'uidp-dev',
      workflowInputValue: 'dev',
    },
  })
})

test('reorders environments for a saved application', async ({ page, github }) => {
  const application = createPersistedApplicationWithEnvironments([
    'dev',
    'test',
    'tst',
    'qa',
    'staging',
    'sandbox',
    'prod',
  ])
  await github.seedAuthenticatedState({
    applicationsById: { [application.id]: application },
    selectedApplicationId: application.id,
  })

  await page.goto('/')

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
    .applicationsById as Record<string, SavedApplication>
  expect(
    Object.keys(
      reorderedApplications[application.id]?.environmentSettingsByName ?? {}
    )
  ).toEqual(['dev', 'prod', 'test', 'tst', 'qa', 'staging', 'sandbox'])
})

test('edits and deletes environments from the environment dialog', async ({
  page,
  github,
}) => {
  const application = createPersistedApplicationWithEnvironments(['dev', 'prod'])
  await github.seedAuthenticatedState({
    applicationsById: { [application.id]: application },
    selectedApplicationId: application.id,
  })

  await page.goto('/')

  await page.getByLabel('Edit dev').click()
  await expect(
    page.getByRole('heading', { name: 'Edit environment' })
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Find or add environment' })
    .fill('development')
  await page
    .getByLabel('Workflow input value (defaults to environment name)')
    .fill('dev-workflow')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.locator('thead a')).toHaveText(['development', 'prod'])

  let savedApplication = await readPersistedApplication(github, application.id)
  expect(savedApplication?.environmentSettingsByName).toMatchObject({
    development: {
      name: 'development',
      workflowInputValue: 'dev-workflow',
    },
    prod: {
      name: 'prod',
      workflowInputValue: 'prod',
    },
  })
  expect(savedApplication?.environmentSettingsByName).not.toHaveProperty('dev')

  await page.getByLabel('Edit development').click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Ok' }).click()

  await expect(page.locator('thead a')).toHaveText(['prod'])

  savedApplication = await readPersistedApplication(github, application.id)
  expect(savedApplication?.environmentSettingsByName).toEqual({
    prod: {
      name: 'prod',
      workflowInputValue: 'prod',
    },
  })
})

test('falls back to file-backed workflows when smart inspection cannot infer deploy workflows', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  github.failWorkflowFile(E2E_WORKFLOW.path)
  await github.seedAuthenticatedState()

  await page.goto('/')
  await openNewApplicationDialog(page)

  await selectRepo(page)
  await openWorkflowSelect(page)
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
  await page.getByRole('button', { name: 'Save' }).click()

  const savedApplication = await readSavedApplication(github)

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings).toMatchObject({
    manualWorkflowHandling: false,
    workflowId: E2E_NON_DEPLOY_WORKFLOW.id,
  })
})

test('manual workflow setup persists manual mode', async ({
  page,
  github,
}) => {
  github.includeDynamicWorkflowFileFailure()
  await github.seedAuthenticatedState()

  await page.goto('/')
  await openNewApplicationDialog(page)

  await selectRepo(page)
  await page.getByLabel('Manual', { exact: true }).check()
  await openWorkflowSelect(page)
  await expect(
    page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name })
  ).toBeVisible()
  await page.getByRole('option', { name: E2E_NON_DEPLOY_WORKFLOW.name }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  const savedApplication = await readSavedApplication(github)

  expect(savedApplication).toBeTruthy()
  expect(savedApplication?.deploySettings).toMatchObject({
    manualWorkflowHandling: true,
    workflowId: E2E_NON_DEPLOY_WORKFLOW.id,
  })

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Manual', { exact: true })).toBeChecked()
})

function applicationNameInput(page: Page) {
  return page.getByRole('textbox', { name: 'Name', exact: true })
}

async function openNewApplicationDialog(page: Page) {
  await page.getByRole('button', { name: /new (application|config)/i }).click()
}

async function openWorkflowSelect(page: Page) {
  await page.locator('#workflow-select').click()
}

async function selectRepo(page: Page) {
  await page.getByLabel('Find repository').fill(E2E_REPO.name)
  await page.getByRole('option', { name: E2E_REPO.name }).click()
}

async function readSavedApplication(github: {
  readPersistedState: () => Promise<any>
}) {
  const persisted = await github.readPersistedState()
  const applications = persisted.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as Record<string, SavedApplication>

  return Object.values(applications).find(
    (application) => application.name === E2E_REPO.name
  )
}

async function readPersistedApplication(
  github: { readPersistedState: () => Promise<any> },
  applicationId: string
) {
  const persisted = await github.readPersistedState()
  const applications = persisted.accountsById[E2E_ACCOUNT_ID].workspace
    .applicationsById as Record<string, SavedApplication>

  return applications[applicationId]
}

function createPersistedApplicationWithEnvironments(environmentNames: string[]) {
  const application = createPersistedApplication()

  return {
    ...application,
    environmentSettingsByName: Object.fromEntries(
      environmentNames.map((name) => [
        name,
        {
          name,
          workflowInputValue: name,
        },
      ])
    ),
  }
}

function createPersistedApplicationWithChoiceWorkflow() {
  const application = createPersistedApplication()

  return {
    ...application,
    deploySettings: {
      ...application.deploySettings,
      environmentKey: 'deploy_target',
      releaseKey: 'release_version',
    },
    environmentSettingsByName: {},
  }
}
