import { describe, expect, test } from 'bun:test'
import {
  addEnvironmentSettings,
  mergeGitHubEnvironments,
  reorderEnvironmentSettings,
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
    )

    expect(Object.keys(merged)).toEqual(['dev', 'qa', 'prod'])
    expect(merged.prod.workflowInputValue).toBe('production')
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
