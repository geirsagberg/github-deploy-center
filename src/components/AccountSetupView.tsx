import {
  Alert,
  Box,
  Button,
  Icon,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AddAccountInput } from '../store/actions'

type AccountSetupViewProps = {
  addAccount: (input: AddAccountInput) => Promise<unknown>
  title?: string
  description?: string
  submitLabel?: string
  onAdded?: () => void
}

export function AccountSetupView({
  addAccount,
  title = 'Add your GitHub account',
  description = "Personal access tokens are stored in your browser's local storage.",
  submitLabel = 'Add account',
  onAdded,
}: AccountSetupViewProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string>()
  const [isAdding, setIsAdding] = useState(false)

  const canAdd = !!token.trim() && !isAdding

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setIsAdding(true)

    try {
      await addAccount({ token })
      onAdded?.()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not add that account. Check the token and try again.'
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
        gap: 2,
        maxWidth: 560,
      }}
    >
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Typography color="text.secondary">
          {description}
        </Typography>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField
        label="Personal access token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        type="password"
        autoComplete="off"
        required
        helperText={
          <>
            <Link target="_blank" href="https://github.com/settings/tokens/new">
              Create a token
            </Link>{' '}
            with the <code>repo</code> scope.
          </>
        }
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!canAdd}
          startIcon={<Icon>person_add</Icon>}
        >
          {isAdding ? 'Adding account...' : submitLabel}
        </Button>
      </Box>
    </Box>
  )
}
