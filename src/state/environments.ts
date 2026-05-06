import type { EnvironmentSettings, GitHubEnvironment } from './schemas'

const environmentNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export type EnvironmentMappingSuggestion = {
  id: string
  enabled: boolean
  environmentName: string
  workflowInputValue: string
  workflowChoice: string
  existingEnvironmentName?: string
}

export function suggestEnvironmentMappings({
  applicationName,
  repoName,
  githubEnvironments,
  workflowInputChoices,
}: {
  applicationName: string
  repoName: string
  githubEnvironments: readonly GitHubEnvironment[]
  workflowInputChoices: readonly string[] | undefined
}) {
  const workflowChoices = uniqueWorkflowChoices(workflowInputChoices)

  if (!workflowChoices.length) return []

  const deployEnvironmentNames = sortEnvironments(
    githubEnvironments.filter((environment) =>
      isDeployEnvironmentName(environment.name),
    ),
  ).map((environment) => environment.name)
  const applicationSlug = toEnvironmentSlug(applicationName)
  const repoSlug = toEnvironmentSlug(repoName)
  const existingEnvironmentNameBySlug = new Map(
    deployEnvironmentNames.map((name) => [toEnvironmentSlug(name), name]),
  )
  const shouldSuggestAppScopedNames =
    !!applicationSlug &&
    (applicationSlug !== repoSlug ||
      workflowChoices.some((choice) =>
        existingEnvironmentNameBySlug.has(
          createApplicationEnvironmentSlug(applicationSlug, choice),
        ),
      ))

  if (shouldSuggestAppScopedNames) {
    return workflowChoices.map((choice, index) => {
      const environmentSlug = createApplicationEnvironmentSlug(
        applicationSlug,
        choice,
      )
      const existingEnvironmentName =
        existingEnvironmentNameBySlug.get(environmentSlug)

      return createEnvironmentMappingSuggestion({
        id: `${index}:${choice}`,
        environmentName: existingEnvironmentName ?? environmentSlug,
        existingEnvironmentName,
        workflowChoice: choice,
        workflowInputValue: choice,
      })
    })
  }

  const workflowInputValueByEnvironmentName =
    resolveUnambiguousEnvironmentWorkflowInputValues(
      deployEnvironmentNames.map((name) => ({ name })),
      workflowChoices,
    )

  return deployEnvironmentNames.flatMap((environmentName) => {
    const workflowInputValue = workflowInputValueByEnvironmentName[
      environmentName
    ]
    const match = resolveEnvironmentWorkflowInputChoice(
      environmentName,
      workflowChoices,
    )

    return workflowInputValue === undefined || !match
      ? []
      : [
          createEnvironmentMappingSuggestion({
            id: environmentName,
            environmentName,
            existingEnvironmentName: environmentName,
            workflowChoice: match.choice,
            workflowInputValue,
          }),
        ]
  })
}

export function resolveEnvironmentWorkflowInputValue(
  environmentName: string,
  workflowInputChoices: readonly string[] | undefined,
) {
  const match = resolveEnvironmentWorkflowInputChoice(
    environmentName,
    workflowInputChoices,
  )

  return match?.workflowInputValue
}

export function resolveUnambiguousEnvironmentWorkflowInputValue(
  environmentName: string,
  githubEnvironments: readonly GitHubEnvironment[],
  workflowInputChoices: readonly string[] | undefined,
) {
  const environments = githubEnvironments.some(
    (environment) => environment.name === environmentName,
  )
    ? githubEnvironments
    : [...githubEnvironments, { name: environmentName }]

  return resolveUnambiguousEnvironmentWorkflowInputValues(
    environments,
    workflowInputChoices,
  )[environmentName]
}

function resolveUnambiguousEnvironmentWorkflowInputValues(
  githubEnvironments: readonly GitHubEnvironment[],
  workflowInputChoices: readonly string[] | undefined,
) {
  const matches = githubEnvironments
    .filter((environment) => isDeployEnvironmentName(environment.name))
    .flatMap((environment) => {
      const match = resolveEnvironmentWorkflowInputChoice(
        environment.name,
        workflowInputChoices,
      )

      return match ? [{ environmentName: environment.name, ...match }] : []
    })
  const matchCountsByChoice = matches.reduce<Record<string, number>>(
    (counts, match) => ({
      ...counts,
      [match.choice]: (counts[match.choice] ?? 0) + 1,
    }),
    {},
  )

  return Object.fromEntries(
    matches.flatMap((match) =>
      matchCountsByChoice[match.choice] === 1
        ? [[match.environmentName, match.workflowInputValue]]
        : [],
    ),
  )
}

function resolveEnvironmentWorkflowInputChoice(
  environmentName: string,
  workflowInputChoices: readonly string[] | undefined,
) {
  if (!workflowInputChoices?.length) return undefined

  if (workflowInputChoices.includes(environmentName)) {
    return {
      choice: environmentName,
      workflowInputValue: '',
    }
  }

  const environmentParts = splitEnvironmentParts(environmentName)
  const partialMatches = workflowInputChoices.filter((choice) =>
    environmentParts.includes(choice.toLowerCase()),
  )

  return partialMatches.length === 1
    ? {
        choice: partialMatches[0],
        workflowInputValue: partialMatches[0],
      }
    : undefined
}

export function addEnvironmentSettings(
  currentSettings: Record<string, EnvironmentSettings>,
  settings: EnvironmentSettings,
) {
  return environmentSettingsByName(
    sortEnvironments([...Object.values(currentSettings), settings]),
  )
}

export function editEnvironmentSettings(
  currentSettings: Record<string, EnvironmentSettings>,
  originalName: string,
  settings: EnvironmentSettings,
) {
  if (!(originalName in currentSettings)) return currentSettings
  if (settings.name !== originalName && settings.name in currentSettings) {
    return currentSettings
  }

  return Object.fromEntries(
    Object.entries(currentSettings).map(([name, environment]) =>
      name === originalName
        ? [settings.name, settings]
        : [name, environment],
    ),
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

export function isProductionEnvironmentValue(value: string) {
  return splitEnvironmentParts(value).some(
    (part) => part === 'prod' || part === 'production',
  )
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
  const parts = splitEnvironmentParts(name)

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

function createEnvironmentMappingSuggestion({
  id,
  environmentName,
  existingEnvironmentName,
  workflowChoice,
  workflowInputValue,
}: Omit<EnvironmentMappingSuggestion, 'enabled'>): EnvironmentMappingSuggestion {
  return {
    id,
    enabled: true,
    environmentName,
    existingEnvironmentName,
    workflowChoice,
    workflowInputValue,
  }
}

function uniqueWorkflowChoices(
  workflowInputChoices: readonly string[] | undefined,
) {
  const seenChoices = new Set<string>()

  return (workflowInputChoices ?? []).flatMap((choice) => {
    const normalizedChoice = choice.trim().toLowerCase()
    if (!normalizedChoice || seenChoices.has(normalizedChoice)) return []

    seenChoices.add(normalizedChoice)
    return [choice.trim()]
  })
}

function createApplicationEnvironmentSlug(
  applicationSlug: string,
  workflowChoice: string,
) {
  const choiceSlug = toEnvironmentSlug(workflowChoice)

  return choiceSlug ? `${applicationSlug}-${choiceSlug}` : applicationSlug
}

function toEnvironmentSlug(value: string) {
  return splitEnvironmentParts(value).join('-')
}

function splitEnvironmentParts(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}
