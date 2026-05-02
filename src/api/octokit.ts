import { Octokit } from '@octokit/rest'

export function createBearerOctokit(token: string) {
  const octokit = new Octokit()

  octokit.hook.before('request', async (options) => {
    options.headers.authorization = `Bearer ${token}`
  })

  return octokit
}
