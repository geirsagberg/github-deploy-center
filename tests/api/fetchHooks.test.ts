import '../setupDom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'bun:test'
import React from 'react'
import { useFetchRepos } from '../../src/api/fetchHooks'
import {
  getGitHubQueryScope,
  githubQueryKeys,
  hashString,
} from '../../src/api/githubRuntime'
import { createAccountProfile } from '../../src/store/accounts'
import { appState } from '../../src/store/state'
import type { RepoModel } from '../../src/state/schemas'

const repo: RepoModel = {
  id: 'repo-1',
  owner: 'octo',
  name: 'deploy-center',
  defaultBranch: 'main',
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  appState.accountsById = {}
  appState.activeAccountId = ''
})

describe('GitHub query keys', () => {
  test('scope includes active account id and a token hash, never the raw token', () => {
    const scope = getGitHubQueryScope({
      activeAccountId: 'work',
      token: 'ghp_secret',
    })

    expect(scope).toEqual({
      activeAccountId: 'work',
      tokenKey: hashString('ghp_secret'),
      repoCacheKey: `work:${hashString('ghp_secret')}`,
    })
    expect(JSON.stringify(scope)).not.toContain('ghp_secret')
  })

  test('repository cache scope changes across accounts even for the same token', () => {
    const workScope = getGitHubQueryScope({
      activeAccountId: 'work',
      token: 'ghp_shared',
    })
    const personalScope = getGitHubQueryScope({
      activeAccountId: 'personal',
      token: 'ghp_shared',
    })

    expect(workScope.tokenKey).toBe(personalScope.tokenKey)
    expect(workScope.repoCacheKey).not.toBe(personalScope.repoCacheKey)
    expect(workScope.repoCacheKey).toBe(`work:${workScope.tokenKey}`)
    expect(personalScope.repoCacheKey).toBe(
      `personal:${personalScope.tokenKey}`
    )
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

  test('repository cache reads localStorage once per account token', () => {
    const accountId = 'work'
    const token = 'ghp_cached_repo_test'
    const scope = getGitHubQueryScope({ activeAccountId: accountId, token })
    const storageKey = `gdc.v2.repos.${scope.repoCacheKey}`
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        savedAt: Date.now(),
        repos: [repo],
        nextCursor: null,
        totalCount: 1,
      })
    )
    appState.accountsById = {
      [accountId]: createAccountProfile({
        id: accountId,
        label: 'Work',
        token,
        githubLogin: 'octo',
        githubUserId: '1',
      }),
    }
    appState.activeAccountId = accountId

    const originalGetItem = localStorage.getItem.bind(localStorage)
    let getItemCalls = 0
    Object.defineProperty(localStorage, 'getItem', {
      configurable: true,
      value: (key: string) => {
        getItemCalls++
        return originalGetItem(key)
      },
    })

    try {
      const renderView = (tick: number) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(RepoCount, { tick })
        )
      const { getByTestId, rerender } = render(renderView(1))

      expect(getByTestId('repo-count').textContent).toBe('1')

      rerender(renderView(2))

      expect(getByTestId('repo-count').textContent).toBe('1')
      expect(getItemCalls).toBe(1)
    } finally {
      Object.defineProperty(localStorage, 'getItem', {
        configurable: true,
        value: originalGetItem,
      })
      queryClient.clear()
    }
  })
})

function RepoCount({ tick }: { tick: number }) {
  const query = useFetchRepos()

  return React.createElement(
    'div',
    { 'data-testid': 'repo-count', 'data-tick': tick },
    query.loadedCount
  )
}
