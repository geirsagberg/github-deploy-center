import { Octokit } from '@octokit/rest'
import { createBearerOctokit } from '../api/octokit'

class GitHubRestApi {
  setToken = (token: string) => {
    this.#octokit = createBearerOctokit(token)
  }

  get octokit() {
    return this.#octokit
  }

  #octokit = new Octokit()
}

export const restApi = new GitHubRestApi()

export const downloadJson = (obj: unknown, fileName: string) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export const uploadJson = async () => {
  const file = await selectJsonFile()
  return file?.text()
}

function selectJsonFile() {
  return new Promise<File | undefined>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.style.display = 'none'

    const finish = (file?: File) => {
      input.remove()
      resolve(file)
    }

    input.addEventListener('change', () => finish(input.files?.[0]), {
      once: true,
    })
    input.addEventListener('cancel', () => finish(), { once: true })

    document.body.append(input)
    input.click()
  })
}
