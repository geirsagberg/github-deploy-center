import { describe, expect, test } from 'bun:test'
import {
  GitHubIdentityError,
  createGitHubIdentityResolver,
} from '../../src/api/githubIdentity'

describe('GitHub identity resolver', () => {
  test('resolves viewer id and login through the supplied request function', async () => {
    const requestedTokens: string[] = []
    const resolveIdentity = createGitHubIdentityResolver(async (token) => {
      requestedTokens.push(token)
      return {
        viewer: {
          id: 'U_123',
          login: 'octocat',
        },
      }
    })

    const identity = await resolveIdentity('ghp_valid')

    expect(requestedTokens).toEqual(['ghp_valid'])
    expect(identity).toEqual({
      id: 'U_123',
      login: 'octocat',
    })
  })

  test('rejects malformed identity responses', async () => {
    const resolveIdentity = createGitHubIdentityResolver(async () => ({
      viewer: {
        id: '',
        login: '',
      },
    }))

    let error: unknown
    try {
      await resolveIdentity('ghp_invalid')
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(GitHubIdentityError)
  })
})
