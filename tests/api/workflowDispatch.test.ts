import { describe, expect, test } from 'bun:test'
import {
  getEnvironmentChoiceOptions,
  inferDeployWorkflowInputs,
  inferEnvironmentInputName,
  inferReleaseInputName,
  parseWorkflowDispatch,
} from '../../src/api/workflowDispatch'

describe('workflow dispatch parsing', () => {
  test('detects workflow_dispatch string triggers', () => {
    expect(parseWorkflowDispatch('on: workflow_dispatch')).toEqual({
      inputs: {},
    })
  })

  test('detects workflow_dispatch array triggers', () => {
    expect(parseWorkflowDispatch('on: [push, workflow_dispatch]')).toEqual({
      inputs: {},
    })
  })

  test('detects workflow_dispatch object triggers', () => {
    expect(
      parseWorkflowDispatch(`
on:
  workflow_dispatch:
`)
    ).toEqual({ inputs: {} })
  })

  test('detects quoted on triggers', () => {
    expect(
      parseWorkflowDispatch(`
"on":
  workflow_dispatch:
`)
    ).toEqual({ inputs: {} })
  })

  test('ignores non-dispatch workflows', () => {
    expect(parseWorkflowDispatch('on: [push, pull_request]')).toBeNull()
  })

  test('ignores invalid YAML', () => {
    expect(parseWorkflowDispatch('on: [workflow_dispatch')).toBeNull()
  })

  test('returns dispatch inputs', () => {
    expect(
      parseWorkflowDispatch(`
on:
  workflow_dispatch:
    inputs:
      release_version:
        description: Release to deploy
      deploy_target:
        type: environment
`)
    ).toEqual({
      inputs: {
        release_version: {},
        deploy_target: { type: 'environment' },
      },
    })
  })

  test('returns choice input options', () => {
    expect(
      parseWorkflowDispatch(`
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options:
          - dev
          - prod
`)
    ).toEqual({
      inputs: {
        environment: { type: 'choice', options: ['dev', 'prod'] },
      },
    })
  })
})

describe('workflow dispatch input inference', () => {
  test('infers release inputs by priority', () => {
    expect(
      inferReleaseInputName({
        release_version: {},
        tag_name: {},
        ref: {},
      })
    ).toBe('ref')

    expect(
      inferReleaseInputName({
        component: {},
        tag_name: {},
        version: {},
      })
    ).toBe('tag_name')
  })

  test('infers environment inputs by priority', () => {
    expect(
      inferEnvironmentInputName({
        environment: {},
        target_env: { type: 'environment' },
      })
    ).toBe('target_env')

    expect(
      inferEnvironmentInputName({
        target: {},
        env: {},
      })
    ).toBe('env')

    expect(
      inferEnvironmentInputName({
        release_version: {},
        deploy_target: { type: 'choice', options: ['dev'] },
      })
    ).toBe('deploy_target')
  })

  test('infers deploy workflows only when both release and environment match', () => {
    expect(
      inferDeployWorkflowInputs({
        release_version: {},
        deploy_target: { type: 'environment' },
      })
    ).toEqual({
      releaseKey: 'release_version',
      environmentKey: 'deploy_target',
    })

    expect(
      inferDeployWorkflowInputs({
        release_version: {},
        deploy_target: { type: 'choice', options: ['dev'] },
      })
    ).toEqual({
      releaseKey: 'release_version',
      environmentKey: 'deploy_target',
    })

    expect(
      inferDeployWorkflowInputs({
        release_version: {},
      })
    ).toBeUndefined()

    expect(
      inferDeployWorkflowInputs({
        deploy_target: { type: 'environment' },
      })
    ).toBeUndefined()
  })

  test('returns environment choice options only for choice inputs', () => {
    expect(
      getEnvironmentChoiceOptions(
        {
          environment: { type: 'choice', options: ['dev', 'prod'] },
          deploy_target: { type: 'environment', options: ['qa'] },
        },
        'environment',
      ),
    ).toEqual(['dev', 'prod'])

    expect(
      getEnvironmentChoiceOptions(
        {
          deploy_target: { type: 'environment', options: ['qa'] },
        },
        'deploy_target',
      ),
    ).toBeUndefined()
  })
})
