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

class Storage {
  save = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value))
  }
  load = (key: string) => {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }
}

export const storage = new Storage()
