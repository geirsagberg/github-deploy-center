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

export const updateWorkflowSettings: Action<
  (settings: DeployWorkflowSettings) => void
> = ({ state: { deploySettingsByRepo, selectedRepo } }, update) => {
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

  const atlas_env = environment.split('-').pop() || environment

  if (
    window.confirm(
      `Are you sure you want to deploy "${release}" to "${atlas_env}" in "${selectedRepo.owner}/${selectedRepo.name}@${deploySettingsForSelectedRepo.ref}"?`
    )
  ) {
    const { owner, name } = selectedRepo
    const {
      ref,
      workflowId,
      environmentKey,
      releaseKey,
    } = deploySettingsForSelectedRepo
    await effects.restApi.octokit.actions.createWorkflowDispatch({
      owner,
      repo: name,
      ref,
      workflow_id: workflowId,
      inputs: { [releaseKey]: release, [environmentKey]: atlas_env },
    })
  }
}
