import { Octokit } from '@octokit/rest'

class GitHubRestApi {
  setToken = (token: string) => {
    this.#octokit = new Octokit({ auth: token })
  }

  get octokit() {
    return this.#octokit
  }

  #octokit = new Octokit()
}

export const restApi = new GitHubRestApi()
