import { describe, expect, test } from 'bun:test'
import {
  hasApplicationWithRepoAndName,
  resolveApplicationName,
} from '../../src/store/applicationIdentity'
import type { ApplicationConfig } from '../../src/state/schemas'

describe('application identity', () => {
  test('uses the repo name when an application name is blank', () => {
    const repo = {
      id: 'repo-1',
      owner: 'octo',
      name: 'deploy-center',
      defaultBranch: 'main',
    }

    expect(resolveApplicationName({ name: '  ', repo })).toBe('deploy-center')
  })

  test('matches saved apps by repo and normalized name', () => {
    const existing = appConfig({
      id: 'app-1',
      name: 'Deploy Center',
      repoId: 'repo-1',
      repoName: 'deploy-center',
    })

    expect(
      hasApplicationWithRepoAndName({
        applicationsById: { [existing.id]: existing },
        name: ' deploy center ',
        repo: existing.repo,
      })
    ).toBe(true)
  })
})

function appConfig({
  id,
  name,
  repoId,
  repoName,
}: {
  id: string
  name: string
  repoId: string
  repoName: string
}): ApplicationConfig {
  return {
    id,
    name,
    releaseFilter: '',
    repo: {
      id: repoId,
      owner: 'octo',
      name: repoName,
      defaultBranch: 'main',
    },
    deploySettings: {
      type: 'workflow',
      environmentKey: 'environment',
      releaseKey: 'ref',
      workflowId: 1,
      ref: 'main',
      extraArgs: {},
      manualWorkflowHandling: false,
    },
    environmentSettingsByName: {},
  }
}
