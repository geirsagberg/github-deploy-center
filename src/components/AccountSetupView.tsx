import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Icon,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import type { AccountTokenStorage } from '../state/schemas'
import type { AddAccountInput } from '../store/actions'

type AccountSetupViewProps = {
  addAccount: (input: AddAccountInput) => Promise<unknown>
  title?: string
  description?: ReactNode
  initialTokenStorage?: AccountTokenStorage
  wide?: boolean
  submitLabel?: string
  submitIcon?: string
  onAdded?: () => void
}

export function AccountSetupView({
  addAccount,
  title = 'Add your GitHub account',
  description,
  initialTokenStorage = 'local',
  wide = false,
  submitLabel = 'Add account',
  submitIcon = 'person_add',
  onAdded,
}: AccountSetupViewProps) {
  const [token, setToken] = useState('')
  const [tokenStorage, setTokenStorage] =
    useState<AccountTokenStorage>(initialTokenStorage)
  const [error, setError] = useState<string>()
  const [isAdding, setIsAdding] = useState(false)

  const canAdd = !isAdding

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setIsAdding(true)

    try {
      await addAccount({ token, tokenStorage })
      onAdded?.()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not add that account. Check the token and try again.',
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'grid',
        gap: wide ? 3 : 2,
        maxWidth: wide ? undefined : 560,
        width: '100%',
        alignItems: 'start',
      }}
    >
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography variant={wide ? 'h4' : 'h5'} component="h2">
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary">{description}</Typography>
        )}
      </Box>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <TextField
            label="Personal access token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            type="password"
            autoComplete="off"
            required
            slotProps={{
              htmlInput: { 'aria-label': 'Personal access token' },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Link
              target="_blank"
              rel="noreferrer"
              href="https://github.com/settings/tokens/new"
            >
              Create a token with the <code>repo</code> scope.
            </Link>
            <FormControlLabel
              control={
                <Checkbox
                  checked={tokenStorage === 'local'}
                  onChange={(event) =>
                    setTokenStorage(event.target.checked ? 'local' : 'session')
                  }
                />
              }
              label="Remember token between sessions"
              sx={{ mr: 0 }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!canAdd}
            fullWidth={wide}
            startIcon={submitIcon ? <Icon>{submitIcon}</Icon> : undefined}
          >
            {isAdding ? 'Adding account...' : submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
