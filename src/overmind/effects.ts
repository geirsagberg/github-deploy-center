import Axios from 'axios'
import { paths } from '../generated/github-types'
import { DeployWorkflowSettings, RepoModel } from './state'

class GitHubRestApi {
  public readonly axios = Axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  })

  setToken = (token: string) => {
    this.axios.defaults.headers.Authorization = 'Bearer ' + token
  }

  triggerDeployWorkflow = async ({
    selectedRepo,
    deploySettings,
    release,
    environment,
  }: {
    selectedRepo: RepoModel
    deploySettings: DeployWorkflowSettings
    release: string
    environment: string
  }) => {
    const data: paths['/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches']['post']['requestBody']['application/json'] = {
      ref: deploySettings.ref,
      inputs: {
        [deploySettings.releaseKey]: release,
        [deploySettings.environmentKey]: environment,
      },
    }
    await this.axios.post(
      `repos/${selectedRepo.owner}/${selectedRepo.name}/actions/workflows/${deploySettings.workflowId}/dispatches`,
      data
    )
  }
}

export const restApi = new GitHubRestApi()
