import { Action, AsyncAction } from 'overmind'
import {
  createDeployWorkflowSettings,
  DeployWorkflowCodec,
  DeployWorkflowSettings,
  RepoModel,
} from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const setSelectedRepo: Action<RepoModel | null> = ({ state }, repo) => {
  state.selectedRepo = repo
}

export const updateWorkflowSettings: Action<(
  settings: DeployWorkflowSettings
) => void> = ({ state: { deploySettingsByRepo, selectedRepo } }, update) => {
  if (selectedRepo) {
    let deploySettings = deploySettingsByRepo[selectedRepo.id]
    if (DeployWorkflowCodec.is(deploySettings)) {
      update(deploySettings)
    } else {
      deploySettings = createDeployWorkflowSettings({
        ref: selectedRepo.defaultBranch,
      })
      update(deploySettings)
      deploySettingsByRepo[selectedRepo.id] = deploySettings
    }
  }
}

export const triggerDeployment: AsyncAction<{
  release: string
  environment: string
}> = async (
  { effects, state: { selectedRepo, deploySettingsForSelectedRepo } },
  { release, environment }
) => {
  if (!selectedRepo || !DeployWorkflowCodec.is(deploySettingsForSelectedRepo))
    return

  if (
    window.confirm(
      `Are you sure you want to deploy "${release}" to "${environment}" in "${selectedRepo.owner}/${selectedRepo.name}@${deploySettingsForSelectedRepo.ref}"?`
    )
  ) {
    await effects.restApi.triggerDeployWorkflow({
      deploySettings: deploySettingsForSelectedRepo,
      environment,
      release,
      selectedRepo,
    })
  }
}
