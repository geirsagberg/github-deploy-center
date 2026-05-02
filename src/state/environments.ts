import type { EnvironmentSettings, GitHubEnvironment } from './schemas'

const environmentNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export function mergeGitHubEnvironments(
  currentSettings: Record<string, EnvironmentSettings>,
  githubEnvironments: readonly GitHubEnvironment[],
) {
  const merged = { ...currentSettings }

  for (const environment of githubEnvironments) {
    if (!isDeployEnvironmentName(environment.name)) continue

    merged[environment.name] ??= {
      name: environment.name,
      workflowInputValue: '',
    }
  }

  return environmentSettingsByName(sortEnvironments(Object.values(merged)))
}

export function addEnvironmentSettings(
  currentSettings: Record<string, EnvironmentSettings>,
  settings: EnvironmentSettings,
) {
  return environmentSettingsByName(
    sortEnvironments([...Object.values(currentSettings), settings]),
  )
}

export function reorderEnvironmentSettings(
  currentSettings: Record<string, EnvironmentSettings>,
  draggedName: string,
  targetName: string,
) {
  const environments = Object.values(currentSettings)
  const fromIndex = environments.findIndex(
    (environment) => environment.name === draggedName,
  )
  const toIndex = environments.findIndex(
    (environment) => environment.name === targetName,
  )

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return currentSettings
  }

  const [draggedEnvironment] = environments.splice(fromIndex, 1)
  const targetIndex = environments.findIndex(
    (environment) => environment.name === targetName,
  )

  environments.splice(
    fromIndex < toIndex ? targetIndex + 1 : targetIndex,
    0,
    draggedEnvironment,
  )

  return environmentSettingsByName(environments)
}

export function sortEnvironments<T extends { name: string }>(
  environments: readonly T[],
) {
  return [...environments].sort(compareEnvironmentNames)
}

export function isDeployEnvironmentName(name: string) {
  return name.toLowerCase() !== 'github-pages'
}

function compareEnvironmentNames(
  first: { name: string },
  second: { name: string },
) {
  return (
    environmentRank(first.name) - environmentRank(second.name) ||
    environmentNameCollator.compare(first.name, second.name)
  )
}

function environmentRank(name: string) {
  if (matchesEnvironmentPrefix(name, ['dev'])) return 0
  if (matchesEnvironmentPrefix(name, ['test', 'tst'])) return 1
  if (matchesEnvironmentPrefix(name, ['qa', 'stag'])) return 2
  if (matchesEnvironmentPrefix(name, ['prod'])) return 4
  return 3
}

function matchesEnvironmentPrefix(name: string, prefixes: string[]) {
  const normalized = name.toLowerCase()
  const parts = normalized.split(/[^a-z0-9]+/).filter(Boolean)

  return prefixes.some(
    (prefix) =>
      normalized.startsWith(prefix) ||
      parts.some((part) => part.startsWith(prefix)),
  )
}

function environmentSettingsByName(environments: EnvironmentSettings[]) {
  return Object.fromEntries(
    environments.map((environment) => [environment.name, environment]),
  )
}
