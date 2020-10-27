import { Box, CircularProgress, TextField, Typography } from '@material-ui/core'
import { Autocomplete } from '@material-ui/lab'
import { orderBy } from 'lodash-es'
import React, { FC } from 'react'
import { useQuery } from 'react-query'
import { RepoFragment } from '../generated/graphql'
import { useActions, useOvermindState } from '../overmind'
import graphQLApi from '../utils/graphQLApi'

export const RepoSearchView: FC = () => {
  const { data, isLoading, error } = useQuery('repos', async () => {
    let after: string | null = null
    let keepFetching = true
    const repos: RepoFragment[] = []
    while (keepFetching) {
      const result = await graphQLApi.fetchReposWithWriteAccess({
        after,
      })
      const { hasNextPage, endCursor } = result.viewer.repositories.pageInfo
      const nodes =
        result.viewer.repositories.nodes?.map((e) => e as RepoFragment) ?? []
      repos.push(...nodes)
      keepFetching = hasNextPage
      after = endCursor as string | null
    }
    return repos.map((r) => ({ id: r.id, name: r.name, owner: r.owner.login }))
  })

  const { selectedRepo } = useOvermindState()
  const { setSelectedRepo } = useActions()

  const options = orderBy(data ?? [], (d) => d.owner.toLowerCase())

  return (
    <>
      <Typography variant="h2">Repositories</Typography>
      {error instanceof Error ? (
        <Typography>Error: {error.message}</Typography>
      ) : (
        <Autocomplete
          loading={isLoading}
          options={options}
          id="search-repos"
          renderInput={(params) => (
            <TextField
              variant="outlined"
              label="Search"
              {...params}
              InputProps={{
                ...params.InputProps,
                startAdornment:
                  isLoading && !selectedRepo ? (
                    <Box
                      maxWidth={24}
                      maxHeight={24}
                      ml={1}
                      component={CircularProgress}></Box>
                  ) : null,
              }}
            />
          )}
          groupBy={(r) => r.owner}
          getOptionLabel={(r) => r.name}
          getOptionSelected={(first, second) => first.id === second.id}
          value={selectedRepo}
          autoHighlight
          onChange={(_, value) => setSelectedRepo(value)}
        />
      )}
    </>
  )
}
