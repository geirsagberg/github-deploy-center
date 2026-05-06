import { describe, expect, test } from 'bun:test'
import {
  getDeployEnvironmentChoices,
  selectDeployWorkflow,
  toPersistedDeploySettings,
  updateManualWorkflowHandling,
} from '../../src/state/deployWorkflow'
import type { DeploymentDialogState } from '../../src/state/deployWorkflow'

describe('deploy workflow settings', () => {
  test('selects a workflow and applies inferred input names', () => {
    const settings = deploySettings()

    selectDeployWorkflow(settings, {
      id: 42,
      deployInputs: {
        releaseKey: 'release_version',
        environmentKey: 'deploy_target',
      },
      dispatchInputs: {
        deploy_target: { type: 'choice', options: ['dev', 'prod'] },
      },
    })

    expect(settings).toMatchObject({
      workflowId: 42,
      releaseKey: 'release_version',
      environmentKey: 'deploy_target',
      dispatchInputs: {
        deploy_target: { type: 'choice', options: ['dev', 'prod'] },
      },
    })
  })

  test('does not infer input names in manual mode', () => {
    const settings = deploySettings({ manualWorkflowHandling: true })

    selectDeployWorkflow(settings, {
      id: 42,
      deployInputs: {
        releaseKey: 'release_version',
        environmentKey: 'deploy_target',
      },
    })

    expect(settings.releaseKey).toBe('ref')
    expect(settings.environmentKey).toBe('environment')
  })

  test('returns choices for the selected environment input', () => {
    expect(
      getDeployEnvironmentChoices(
        deploySettings({
          environmentKey: 'deploy_target',
          dispatchInputs: {
            deploy_target: { type: 'choice', options: ['dev'] },
          },
        }),
      ),
    ).toEqual(['dev'])
  })

  test('strips transient dispatch metadata before persistence', () => {
    const settings = deploySettings({
      dispatchInputs: {
        deploy_target: { type: 'choice', options: ['dev'] },
      },
      extraArgs: {
        dry_run: 'false',
      },
    })
    const persisted = toPersistedDeploySettings(settings)

    expect(persisted).toEqual({
      type: 'workflow',
      environmentKey: 'environment',
      releaseKey: 'ref',
      workflowId: 0,
      ref: 'main',
      extraArgs: {
        dry_run: 'false',
      },
      manualWorkflowHandling: false,
    })
    expect('dispatchInputs' in persisted).toBe(false)
    expect(persisted.extraArgs).not.toBe(settings.extraArgs)
  })

  test('clears selected workflow metadata when switching manual mode', () => {
    const settings = deploySettings({
      workflowId: 42,
      dispatchInputs: {
        deploy_target: { type: 'choice', options: ['dev'] },
      },
    })

    updateManualWorkflowHandling(settings, true)

    expect(settings.workflowId).toBe(0)
    expect(settings.dispatchInputs).toBeUndefined()
    expect(settings.manualWorkflowHandling).toBe(true)
  })
})

function deploySettings(
  overrides: Partial<DeploymentDialogState> = {},
): DeploymentDialogState {
  return {
    type: 'workflow',
    environmentKey: 'environment',
    releaseKey: 'ref',
    workflowId: 0,
    ref: 'main',
    extraArgs: {},
    manualWorkflowHandling: false,
    ...overrides,
  }
}
