import { describe, expect, test } from 'bun:test'
import {
  addEnvironmentSettings,
  editEnvironmentSettings,
  mergeGitHubEnvironments,
  reorderEnvironmentSettings,
  resolveEnvironmentWorkflowInputValue,
  sortEnvironments,
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
        { name: 'uidp-prod' },
        { name: 'uidp-dev' },
        { name: 'uidp-staging' },
        { name: 'uidp-tst' },
      ]).map((environment) => environment.name),
    ).toEqual(['uidp-dev', 'uidp-tst', 'uidp-staging', 'uidp-prod'])
  })

  test('merges GitHub environments without replacing existing settings', () => {
    const merged = mergeGitHubEnvironments(
      {
        prod: settings('prod', 'production'),
      },
      [
        { name: 'github-pages' },
        { name: 'qa' },
        { name: 'dev' },
        { name: 'prod' },
      ],
      ['dev', 'qa', 'prod'],
    )

    expect(Object.keys(merged)).toEqual(['dev', 'qa', 'prod'])
    expect(merged.prod.workflowInputValue).toBe('production')
  })

  test('skips preregistration when workflow choices are unavailable', () => {
    const merged = mergeGitHubEnvironments(
      {
        prod: settings('prod', 'production'),
      },
      [{ name: 'dev' }, { name: 'prod' }],
      undefined,
    )

    expect(merged).toEqual({
      prod: settings('prod', 'production'),
    })
  })

  test('maps GitHub environments from exact and unambiguous choice matches', () => {
    const merged = mergeGitHubEnvironments(
      {},
      [
        { name: 'prod' },
        { name: 'uidp-dev' },
        { name: 'uidp-ops' },
        { name: 'github-pages' },
      ],
      ['dev', 'prod'],
    )

    expect(merged).toEqual({
      'uidp-dev': settings('uidp-dev', 'dev'),
      prod: settings('prod', ''),
    })
  })

  test('resolves exact, partial, ambiguous, and missing choice matches', () => {
    expect(resolveEnvironmentWorkflowInputValue('prod', ['dev', 'prod'])).toBe(
      '',
    )
    expect(
      resolveEnvironmentWorkflowInputValue('uidp-dev', ['dev', 'prod']),
    ).toBe('dev')
    expect(
      resolveEnvironmentWorkflowInputValue('uidp-dev', ['uidp', 'dev']),
    ).toBeUndefined()
    expect(
      resolveEnvironmentWorkflowInputValue('uidp-ops', ['dev', 'prod']),
    ).toBeUndefined()
    expect(
      resolveEnvironmentWorkflowInputValue('uidp-dev', undefined),
    ).toBeUndefined()
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
})
