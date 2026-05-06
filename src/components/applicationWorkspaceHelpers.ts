import type { ApplicationConfig } from '../state/schemas'

export type {
  EnvironmentDeployStatus,
  EnvironmentStatusesByApplicationId,
} from '../state/deploymentMatrix'

export type ExtraArgEntry = [string, string]

export function getEnvironmentNames(application: ApplicationConfig) {
  return Object.keys(application.environmentSettingsByName)
}

export function getExtraArgEntries({
  deploySettings,
}: {
  deploySettings: { extraArgs: Record<string, string> }
}): ExtraArgEntry[] {
  return Object.entries(deploySettings.extraArgs).sort(([left], [right]) =>
    left.localeCompare(right),
  )
}

export function formatExtraArgsLabel(count: number) {
  return `${count} custom workflow ${count === 1 ? 'arg' : 'args'}`
}

export function formatExtraArgsTooltip(extraArgEntries: ExtraArgEntry[]) {
  const names = extraArgEntries.map(([key]) => key).join(', ')
  return `${formatExtraArgsLabel(extraArgEntries.length)}: ${names}`
}
