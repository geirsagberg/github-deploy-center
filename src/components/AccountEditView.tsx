import {
  Alert,
  Box,
  Button,
  Icon,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AccountProfile } from '../state/schemas'
import { formatAccountName } from '../store/accounts'
import {
  DifferentIdentityTokenError,
  type AddAccountInput,
  type EditAccountInput,
} from '../store/actions'

type AccountEditViewProps = {
  account: AccountProfile
  addAccount: (input: AddAccountInput) => Promise<unknown>
  editAccount: (input: EditAccountInput) => Promise<unknown>
  removeAccount: (accountId: string) => Promise<boolean>
  onSaved?: () => void
}

export function AccountEditView({
  account,
  addAccount,
  editAccount,
  removeAccount,
  onSaved,
}: AccountEditViewProps) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string>()
  const [differentIdentity, setDifferentIdentity] =
    useState<DifferentIdentityTokenError>()
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAddingDifferentIdentity, setIsAddingDifferentIdentity] =
    useState(false)

  const canSave =
    !!token.trim() && !isSaving && !isRemoving && !isAddingDifferentIdentity

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setDifferentIdentity(undefined)
    setIsSaving(true)

    try {
      await editAccount({
        accountId: account.id,
        token,
      })
      onSaved?.()
    } catch (error) {
      if (error instanceof DifferentIdentityTokenError) {
        setDifferentIdentity(error)
      }
      setError(
        error instanceof Error
          ? error.message
          : 'Could not save that account. Check the token and try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDifferentIdentity = async () => {
    if (!differentIdentity) return

    setError(undefined)
    setIsAddingDifferentIdentity(true)
    try {
      await addAccount({
        token,
      })
      onSaved?.()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not add that account. Check the token and try again.'
      )
    } finally {
      setIsAddingDifferentIdentity(false)
    }
  }

  const handleRemove = async () => {
    setError(undefined)
    setDifferentIdentity(undefined)
    setIsRemoving(true)
    try {
      const removed = await removeAccount(account.id)
      if (removed) {
        onSaved?.()
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not remove that account.'
      )
    } finally {
      setIsRemoving(false)
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
      {differentIdentity ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={isAddingDifferentIdentity}
              onClick={handleAddDifferentIdentity}
            >
              {isAddingDifferentIdentity
                ? 'Adding...'
                : `Add @${differentIdentity.replacementIdentity.login}`}
            </Button>
          }
        >
          Keep this workspace on {formatAccountName(account)}, or add the new
          identity as a separate account.
        </Alert>
      ) : null}
      <Typography color="text.secondary">{formatAccountName(account)}</Typography>
      <TextField
        label="Replace personal access token"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        type="password"
        autoComplete="off"
        helperText="Leave blank to keep the current token. Replacements must belong to the same GitHub user."
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Button
          color="error"
          disabled={isRemoving || isSaving || isAddingDifferentIdentity}
          startIcon={<Icon>delete</Icon>}
          onClick={handleRemove}
        >
          {isRemoving ? 'Removing account...' : 'Remove account'}
        </Button>
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
