import { v4 as uuid } from 'uuid'
import type { ApplicationConfig } from '../state/schemas'
import { normalizeSelectedApplicationId } from './accounts'

type CreateId = () => string

export type ApplicationImportMergeResult = {
  applicationsById: Record<string, ApplicationConfig>
  selectedApplicationId: string
  importedApplicationIds: string[]
}

export function mergeImportedApplications(
  existingApplicationsById: Record<string, ApplicationConfig>,
  selectedApplicationId: string,
  importedApplicationsById: Record<string, ApplicationConfig>,
  createId: CreateId = uuid
): ApplicationImportMergeResult {
  const applicationsById = { ...existingApplicationsById }
  const usedApplicationIds = new Set(Object.keys(applicationsById))
  const importedApplicationIds: string[] = []

  for (const importedApplication of Object.values(importedApplicationsById)) {
    const application = cloneApplicationConfig(importedApplication)
    const applicationId = usedApplicationIds.has(application.id)
      ? createUniqueApplicationId(usedApplicationIds, createId)
      : application.id

    application.id = applicationId
    applicationsById[applicationId] = application
    usedApplicationIds.add(applicationId)
    importedApplicationIds.push(applicationId)
  }

  const normalizedSelection = normalizeSelectedApplicationId(
    applicationsById,
    selectedApplicationId
  )

  return {
    applicationsById,
    selectedApplicationId:
      selectedApplicationId || !importedApplicationIds.length
        ? normalizedSelection
        : importedApplicationIds[0],
    importedApplicationIds,
  }
}

function createUniqueApplicationId(
  usedApplicationIds: Set<string>,
  createId: CreateId
) {
  let id = createId()

  while (usedApplicationIds.has(id)) {
    id = createId()
  }

  return id
}

function cloneApplicationConfig(
  application: ApplicationConfig
): ApplicationConfig {
  return {
    ...application,
    repo: { ...application.repo },
    deploySettings: {
      ...application.deploySettings,
      extraArgs: { ...application.deploySettings.extraArgs },
    },
    environmentSettingsByName: Object.fromEntries(
      Object.entries(application.environmentSettingsByName).map(
        ([name, settings]) => [name, { ...settings }]
      )
    ),
  }
}
