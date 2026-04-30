import { Alert, Box, Button, Icon, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountProfile } from '../state/schemas'
import type { EditAccountInput } from '../store/actions'

type AccountEditViewProps = {
  account: AccountProfile
  editAccount: (input: EditAccountInput) => Promise<unknown>
  onSaved?: () => void
}

export function AccountEditView({
  account,
  editAccount,
  onSaved,
}: AccountEditViewProps) {
  const [label, setLabel] = useState(account.label)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  const canSave = !!label.trim() && !isSaving

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setIsSaving(true)

    try {
      await editAccount({
        accountId: account.id,
        label,
        token,
      })
      onSaved?.()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not save that account. Check the token and try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'grid', gap: 2, maxWidth: 560 }}
    >
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Typography variant="h5" component="h2">
          Edit account
        </Typography>
        <Typography color="text.secondary">
          Personal access tokens are stored in your browser&apos;s local
          storage.
        </Typography>
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TextField
        label="Account label"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        autoComplete="off"
        required
      />
      <TextField
        label="Replace personal access token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        type="password"
        autoComplete="off"
        helperText="Leave blank to keep the current token. Replacements must belong to the same GitHub user."
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={!canSave}
          startIcon={<Icon>save</Icon>}
        >
          {isSaving ? 'Saving account...' : 'Save account'}
        </Button>
      </Box>
    </Box>
  )
}
