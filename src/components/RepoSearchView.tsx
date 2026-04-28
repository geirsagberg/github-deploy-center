import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import type { UIEvent } from 'react'
import type { RepoModel } from '../state/schemas'

interface RepoSearchBoxProps {
  isLoading: boolean
  options: RepoModel[]
  statusText?: string
  selectedRepo: RepoModel | null
  onLoadMore?: () => void
  setSelectedRepo: (value: RepoModel | null) => void
}

export const RepoSearchBox = ({
  isLoading,
  onLoadMore,
  options,
  selectedRepo,
  setSelectedRepo,
  statusText,
}: RepoSearchBoxProps) => {
  const handleListboxScroll = (event: UIEvent<HTMLElement>) => {
    if (!onLoadMore) return

    const listbox = event.currentTarget
    const distanceToBottom =
      listbox.scrollHeight - listbox.scrollTop - listbox.clientHeight

    if (distanceToBottom < 48) {
      onLoadMore()
    }
  }

  return (
    <Autocomplete
      loading={isLoading}
      loadingText={statusText ?? 'Loading repositories...'}
      options={options}
      id="search-repos"
      slotProps={{
        listbox: {
          onScroll: handleListboxScroll,
        },
      }}
      renderInput={(params) => (
        <TextField
          variant="outlined"
          label="Find repository"
          helperText={statusText}
          {...params}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {isLoading && !selectedRepo ? (
                    <CircularProgress size={24} sx={{ ml: 1 }} />
                  ) : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
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
}
