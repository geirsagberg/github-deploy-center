import { describe, expect, test } from 'bun:test'
import {
  addEnvironmentSettings,
  editEnvironmentSettings,
  isProductionEnvironmentValue,
  reorderEnvironmentSettings,
  resolveEnvironmentWorkflowInputValue,
  resolveUnambiguousEnvironmentWorkflowInputValue,
  sortEnvironments,
  suggestEnvironmentMappings,
} from '../../src/state/environments'
import type { EnvironmentSettings } from '../../src/state/schemas'

const settings = (
  name: string,
  workflowInputValue = '',
): EnvironmentSettings => ({
  name,
  workflowInputValue,
})

describe('environment ordering', () => {
  test('sorts environments by deployment progression', () => {
    expect(
      sortEnvironments([
        { name: 'prod' },
        { name: 'sandbox' },
        { name: 'staging' },
        { name: 'tst' },
        { name: 'dev2' },
        { name: 'qa' },
        { name: 'dev10' },
        { name: 'test' },
      ]).map((environment) => environment.name),
    ).toEqual([
      'dev2',
      'dev10',
      'test',
      'tst',
      'qa',
      'staging',
      'sandbox',
      'prod',
    ])
  })

  test('recognizes environment suffixes after app prefixes', () => {
    expect(
      sortEnvironments([
        { name: 'sample-prod' },
        { name: 'sample-dev' },
        { name: 'sample-staging' },
        { name: 'sample-tst' },
      ]).map((environment) => environment.name),
    ).toEqual(['sample-dev', 'sample-tst', 'sample-staging', 'sample-prod'])
  })

  test('suggests app-scoped mappings from workflow choices', () => {
    const suggestions = suggestEnvironmentMappings({
      applicationName: 'Sample',
      repoName: 'platform',
      githubEnvironments: [
        { name: 'sample-admin-qa' },
        { name: 'sample-dev' },
        { name: 'sample-prod' },
        { name: 'github-pages' },
      ],
      workflowInputChoices: ['dev', 'qa', 'prod'],
    })

    expect(suggestions).toMatchObject([
      {
        enabled: true,
        environmentName: 'sample-dev',
        existingEnvironmentName: 'sample-dev',
        workflowChoice: 'dev',
        workflowInputValue: 'dev',
      },
      {
        enabled: true,
        environmentName: 'sample-qa',
        workflowChoice: 'qa',
        workflowInputValue: 'qa',
      },
      {
        enabled: true,
        environmentName: 'sample-prod',
        existingEnvironmentName: 'sample-prod',
        workflowChoice: 'prod',
        workflowInputValue: 'prod',
      },
    ])
    expect(suggestions[1].existingEnvironmentName).toBeUndefined()
  })

  test('suggests exact existing environments for generic repo mappings', () => {
    const suggestions = suggestEnvironmentMappings({
      applicationName: 'deploy-center-fixture',
      repoName: 'deploy-center-fixture',
      githubEnvironments: [
        { name: 'dev' },
        { name: 'sample-qa' },
        { name: 'prod' },
        { name: 'github-pages' },
      ],
      workflowInputChoices: ['dev', 'qa', 'prod'],
    })

    expect(suggestions).toMatchObject([
      {
        environmentName: 'dev',
        existingEnvironmentName: 'dev',
        workflowChoice: 'dev',
        workflowInputValue: '',
      },
      {
        environmentName: 'sample-qa',
        existingEnvironmentName: 'sample-qa',
        workflowChoice: 'qa',
        workflowInputValue: 'qa',
      },
      {
        environmentName: 'prod',
        existingEnvironmentName: 'prod',
        workflowChoice: 'prod',
        workflowInputValue: '',
      },
    ])
  })

  test('does not suggest mappings when workflow choices are unavailable', () => {
    expect(
      suggestEnvironmentMappings({
        applicationName: 'Sample',
        repoName: 'platform',
        githubEnvironments: [{ name: 'sample-dev' }],
        workflowInputChoices: undefined,
      }),
    ).toEqual([])
  })

  test('resolves exact, partial, ambiguous, and missing choice matches', () => {
    expect(resolveEnvironmentWorkflowInputValue('prod', ['dev', 'prod'])).toBe(
      '',
    )
    expect(
      resolveEnvironmentWorkflowInputValue('sample-dev', ['dev', 'prod']),
    ).toBe('dev')
    expect(
      resolveEnvironmentWorkflowInputValue('sample-dev', ['sample', 'dev']),
    ).toBeUndefined()
    expect(
      resolveEnvironmentWorkflowInputValue('sample-ops', ['dev', 'prod']),
    ).toBeUndefined()
    expect(
      resolveEnvironmentWorkflowInputValue('sample-dev', undefined),
    ).toBeUndefined()
  })

  test('resolves a workflow choice only when the reverse mapping is unique', () => {
    const githubEnvironments = [
      { name: 'sample-admin-dev' },
      { name: 'sample-api-dev' },
      { name: 'sample-qa' },
    ]

    expect(
      resolveUnambiguousEnvironmentWorkflowInputValue(
        'sample-qa',
        githubEnvironments,
        ['dev', 'qa'],
      ),
    ).toBe('qa')
    expect(
      resolveUnambiguousEnvironmentWorkflowInputValue(
        'sample-admin-dev',
        githubEnvironments,
        ['dev', 'qa'],
      ),
    ).toBeUndefined()
    expect(
      resolveUnambiguousEnvironmentWorkflowInputValue(
        'sample-prod',
        githubEnvironments,
        ['dev', 'qa', 'prod'],
      ),
    ).toBe('prod')
  })

  test('sorts manually added environments', () => {
    expect(
      Object.keys(
        addEnvironmentSettings(
          {
            prod: settings('prod'),
          },
          settings('dev'),
        ),
      ),
    ).toEqual(['dev', 'prod'])
  })

  test('edits an environment without changing its order', () => {
    const edited = editEnvironmentSettings(
      {
        dev: settings('dev'),
        test: settings('test'),
        prod: settings('prod'),
      },
      'test',
      settings('qa', 'quality-assurance'),
    )

    expect(Object.keys(edited)).toEqual(['dev', 'qa', 'prod'])
    expect(edited.qa.workflowInputValue).toBe('quality-assurance')
  })

  test('keeps environments unchanged when editing to a duplicate name', () => {
    const current = {
      dev: settings('dev'),
      prod: settings('prod'),
    }

    expect(editEnvironmentSettings(current, 'dev', settings('prod'))).toBe(
      current,
    )
  })

  test('reorders environments by dragging before or after the target', () => {
    const current = {
      dev: settings('dev'),
      test: settings('test'),
      qa: settings('qa'),
      prod: settings('prod'),
    }

    expect(Object.keys(reorderEnvironmentSettings(current, 'dev', 'qa'))).toEqual(
      ['test', 'qa', 'dev', 'prod'],
    )

    expect(
      Object.keys(reorderEnvironmentSettings(current, 'prod', 'test')),
    ).toEqual(['dev', 'prod', 'test', 'qa'])
  })

  test('detects production environments by token', () => {
    expect(isProductionEnvironmentValue('prod')).toBe(true)
    expect(isProductionEnvironmentValue('production')).toBe(true)
    expect(isProductionEnvironmentValue('sample-prod')).toBe(true)
    expect(isProductionEnvironmentValue('production-eu')).toBe(true)
    expect(isProductionEnvironmentValue('product-preview')).toBe(false)
    expect(isProductionEnvironmentValue('preprod')).toBe(false)
  })
})
