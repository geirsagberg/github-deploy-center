import type { ApplicationConfig, RepoModel } from '../state/schemas'

export function resolveApplicationName({
  name,
  repo,
}: {
  name: string
  repo: RepoModel
}) {
  return name.trim() || repo.name
}

export function hasApplicationWithRepoAndName({
  applicationsById,
  excludeApplicationId,
  name,
  repo,
}: {
  applicationsById: Record<string, ApplicationConfig>
  excludeApplicationId?: string
  name: string
  repo: RepoModel
}) {
  const identityKey = getApplicationIdentityKey({ name, repo })

  return Object.values(applicationsById).some(
    (application) =>
      application.id !== excludeApplicationId &&
      getApplicationIdentityKey(application) === identityKey
  )
}

export function getApplicationIdentityKey({
  name,
  repo,
}: {
  name: string
  repo: RepoModel
}) {
  return `${repo.id}:${resolveApplicationName({ name, repo }).toLowerCase()}`
}
