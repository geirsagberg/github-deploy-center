import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material'
import { FC } from 'react'
import { RepoModel } from '../overmind/state'

interface RepoSearchBoxProps {
  isLoading: boolean
  options: RepoModel[]
  selectedRepo: RepoModel | null
  setSelectedRepo: (value: RepoModel | null) => void
}

export const RepoSearchBox: FC<RepoSearchBoxProps> = ({
  isLoading,
  options,
  selectedRepo,
  setSelectedRepo,
}) => (
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
          endAdornment:
            isLoading && !selectedRepo ? (
              <Box
                maxWidth={24}
                maxHeight={24}
                ml={1}
                component={CircularProgress}
              ></Box>
            ) : null,
        }}
      />
    )}
    groupBy={(r) => r.owner}
    getOptionLabel={(r) => r.name}
    isOptionEqualToValue={(option, value) => option.name === value.name}
    value={selectedRepo}
    autoHighlight
    onChange={(_, value) => setSelectedRepo(value)}
  />
)
