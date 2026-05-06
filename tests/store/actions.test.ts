import { afterEach, describe, expect, test } from 'bun:test'
import { editApplication, saveApplication } from '../../src/store/actions'
import { createAccountProfile } from '../../src/store/accounts'
import { appState } from '../../src/store/state'
import type { ApplicationConfig } from '../../src/state/schemas'

afterEach(() => {
  appState.accountsById = {}
  appState.activeAccountId = ''
  delete appState.newApplicationDialog
  delete appState.editApplicationDialog
  delete appState.environmentMappingDialog
  delete appState.addEnvironmentDialog
  delete appState.editEnvironmentDialog
  delete appState.settingsDialog
})

describe('application actions', () => {
  test('saves an existing application without inferring environments', () => {
    const application = appConfig()
    appState.accountsById.work = createAccountProfile({
      id: 'work',
      workspace: {
        applicationsById: { [application.id]: application },
        selectedApplicationId: application.id,
      },
    })
    appState.activeAccountId = 'work'

    editApplication()
    saveApplication({
      deploySettings: {
        ...application.deploySettings,
        environmentKey: 'deploy_target',
        releaseKey: 'release_version',
        dispatchInputs: {
          deploy_target: {
            type: 'choice',
            options: ['dev', 'qa', 'prod'],
          },
        },
      },
      githubEnvironments: [
        { name: 'dev' },
        { name: 'qa' },
        { name: 'prod' },
        { name: 'github-pages' },
      ],
      repo: application.repo,
      name: 'Saved App',
      releaseFilter: 'app-v',
    })

    expect(application.name).toBe('Saved App')
    expect(application.releaseFilter).toBe('app-v')
    expect(application.deploySettings.releaseKey).toBe('release_version')
    expect(application.deploySettings.environmentKey).toBe('deploy_target')
    expect('dispatchInputs' in application.deploySettings).toBe(false)
    expect(application.environmentSettingsByName).toEqual({
      dev: {
        name: 'dev',
        workflowInputValue: 'dev',
      },
    })
  })
})

function appConfig(): ApplicationConfig {
  return {
    id: 'app-1',
    name: 'Existing App',
    releaseFilter: 'v',
    repo: {
      id: 'repo-1',
      owner: 'octo',
      name: 'deploy-center',
      defaultBranch: 'main',
    },
    deploySettings: {
      type: 'workflow',
      environmentKey: 'environment',
      releaseKey: 'ref',
      workflowId: 42,
      ref: 'main',
      extraArgs: {},
      manualWorkflowHandling: false,
    },
    environmentSettingsByName: {
      dev: {
        name: 'dev',
        workflowInputValue: 'dev',
      },
    },
  }
}
