import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import type { RepoModel } from '../state/schemas'

interface RepoSearchBoxProps {
  isLoading: boolean
  options: RepoModel[]
  selectedRepo: RepoModel | null
  setSelectedRepo: (value: RepoModel | null) => void
}

export const RepoSearchBox = ({
  isLoading,
  options,
  selectedRepo,
  setSelectedRepo,
}: RepoSearchBoxProps) => (
  <Autocomplete
    loading={isLoading}
    options={options}
    id="search-repos"
    renderInput={(params) => (
      <TextField
        variant="outlined"
        label="Find repository"
        {...params}
        slotProps={{
          ...params.slotProps,
          input: {
            ...params.slotProps.input,
            endAdornment:
              isLoading && !selectedRepo ? (
                <CircularProgress size={24} sx={{ ml: 1 }} />
              ) : null,
          },
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
