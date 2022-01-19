import { Octokit } from '@octokit/rest'
import { fileOpen, fileSave } from 'browser-fs-access'

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

export const downloadJson = (obj: any, fileName: string) =>
  fileSave(
    new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }),
    { fileName }
  )

export const uploadJson = async () => {
  const blob = await fileOpen({
    mimeTypes: ['application/json'],
    extensions: ['.json'],
  })
  const json = await blob.text()
  return json
}
