import { Alert, AlertTitle } from '@mui/material'

export function CredentialErrorAlert({
  title = 'Could not load GitHub data',
}: {
  title?: string
}) {
  return (
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      Your personal access token may be expired or revoked. Edit the active
      account and replace the token, then try again.
    </Alert>
  )
}
