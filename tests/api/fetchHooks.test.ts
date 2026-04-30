import { describe, expect, test } from 'bun:test'
import {
  getGitHubQueryScope,
  githubQueryKeys,
  hashString,
} from '../../src/api/fetchHooks'
import type { RepoModel } from '../../src/state/schemas'

const repo: RepoModel = {
  id: 'repo-1',
  owner: 'octo',
  name: 'deploy-center',
  defaultBranch: 'main',
}

describe('GitHub query keys', () => {
  test('scope includes active account id and a token hash, never the raw token', () => {
    const scope = getGitHubQueryScope({
      activeAccountId: 'work',
      token: 'ghp_secret',
    })

    expect(scope).toEqual({
      activeAccountId: 'work',
      tokenKey: hashString('ghp_secret'),
    })
    expect(JSON.stringify(scope)).not.toContain('ghp_secret')
  })

  test('all GitHub-backed query keys include the active account scope', () => {
    const scope = getGitHubQueryScope({
      activeAccountId: 'personal',
      token: 'ghp_personal',
    })

    const keys = [
      githubQueryKeys.releases(scope, repo, 'app-v'),
      githubQueryKeys.workflows(scope, repo),
      githubQueryKeys.workflowRuns(scope, repo, 123, 50),
      githubQueryKeys.environments(scope, repo),
      githubQueryKeys.repos(scope),
    ]

    for (const key of keys) {
      expect(key).toContain('personal')
      expect(key).toContain(scope.tokenKey)
      expect(JSON.stringify(key)).not.toContain('ghp_personal')
    }
  })
})
