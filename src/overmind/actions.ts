import { Action, AsyncAction } from 'overmind'
import {
  createApplicationConfig,
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

export const showNewApplicationModal: Action = ({
  state: { applicationDialog },
}) => {
  applicationDialog.open = true
}

export const updateWorkflowSettings: Action<
  (settings: DeployWorkflowSettings) => void
> = ({ state: { deploySettingsByRepo, selectedApplication } }, update) => {
  if (selectedApplication) {
    let deploySettings = selectedApplication.deploySettings
    if (DeployWorkflowCodec.is(deploySettings)) {
      update(deploySettings)
    } else {
      deploySettings = createDeployWorkflowSettings({
        ref: selectedApplication.repo.defaultBranch,
      })
      update(deploySettings)
      deploySettingsByRepo[selectedApplication.id] = deploySettings
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

  const env = environment.split('-').pop() || environment

  if (
    window.confirm(
      `Are you sure you want to deploy "${release}" to "${env}" in "${selectedRepo.owner}/${selectedRepo.name}@${deploySettingsForSelectedRepo.ref}"?`
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
      inputs: { [releaseKey]: release, [environmentKey]: env },
    })
  }
}

export const createNewApplication: Action<RepoModel> = ({ state }, repo) => {
  const appConfig = createApplicationConfig(repo)
  state.applicationsById[appConfig.id] = appConfig
  state.selectedApplicationId = appConfig.id
  state.applicationDialog.open = false
}

export const cancelNewApplication: Action = ({ state }) => {
  state.applicationDialog.open = false
}

export const selectApplication: Action<string> = ({ state }, id) => {
  state.selectedApplicationId = id
}
