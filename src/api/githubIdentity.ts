import { GraphQLClient } from 'graphql-request'
import { z } from 'zod'

const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql'

const GITHUB_IDENTITY_QUERY = /* GraphQL */ `
  query githubIdentity {
    viewer {
      id
      login
    }
  }
`

const githubIdentityResponseSchema = z.object({
  viewer: z.object({
    id: z.string().min(1),
    login: z.string().min(1),
  }),
})

export type GitHubIdentity = {
  id: string
  login: string
}

export type GitHubIdentityResolver = (token: string) => Promise<GitHubIdentity>

export class GitHubIdentityError extends Error {
  constructor() {
    super('Could not validate the personal access token.')
    this.name = 'GitHubIdentityError'
  }
}

export function createGitHubIdentityResolver(
  requestIdentity: (token: string) => Promise<unknown>
): GitHubIdentityResolver {
  return async (token) => {
    try {
      const result = githubIdentityResponseSchema.parse(
        await requestIdentity(token)
      )
      return result.viewer
    } catch {
      throw new GitHubIdentityError()
    }
  }
}

export const resolveGitHubIdentity = createGitHubIdentityResolver(
  async (token) => {
    const client = new GraphQLClient(GITHUB_GRAPHQL_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return client.request(GITHUB_IDENTITY_QUERY)
  }
)
