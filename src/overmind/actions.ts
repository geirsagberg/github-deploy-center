import { Action } from 'overmind'
import { RepoModel } from './state'

export const setToken: Action<string> = ({ state }, token) => {
  state.token = token
}

export const setSelectedRepo: Action<RepoModel | null> = ({ state }, repo) => {
  state.selectedRepo = repo
}

export const setWorkflowForSelectedRepo: Action<string> = (
  { state: { selectedRepoId, deploySettingsByRepo } },
  workflowId
) => {
  if (selectedRepoId) {
    if (deploySettingsByRepo[selectedRepoId]) {
      deploySettingsByRepo[selectedRepoId].action.workflowId = workflowId
    } else {
      deploySettingsByRepo[selectedRepoId] = {
        type: 'action',
        action: {
          inputs: [],
          workflowId,
        },
      }
    }
  }
}

export const addWorkflowInput: Action = ({
  state: { selectedRepoId, deploySettingsByRepo },
}) => {
  if (selectedRepoId) {
    if (deploySettingsByRepo[selectedRepoId]) {
      if (!Array.isArray(deploySettingsByRepo[selectedRepoId].action.inputs)) {
        deploySettingsByRepo[selectedRepoId].action.inputs = []
      }
      deploySettingsByRepo[selectedRepoId].action.inputs.push(['', ''])
    } else {
      deploySettingsByRepo[selectedRepoId] = {
        type: 'action',
        action: {
          inputs: [['', '']],
          workflowId: '',
        },
      }
    }
  }
}

export const deleteWorkflowInput: Action<number> = (
  { state: { deploySettingsForSelectedRepo } },
  index
) => {
  deploySettingsForSelectedRepo.action.inputs.splice(index, 1)
}

export const updateInput: Action<{
  index: number
  key: string
  value: string
}> = ({ state: { deploySettingsForSelectedRepo } }, { index, key, value }) => {
  deploySettingsForSelectedRepo.action.inputs[index] = [key, value]
}
