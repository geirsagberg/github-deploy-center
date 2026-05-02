import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Icon,
  InputLabel,
  Select,
} from '@mui/material'
import { useState } from 'react'
import type { AccountProfile } from '../state/schemas'
import { formatAccountName } from '../store/accounts'
import type { AddAccountInput, EditAccountInput } from '../store/actions'
import { AccountEditView } from './AccountEditView'
import { AccountSetupView } from './AccountSetupView'

type AccountSwitcherViewProps = {
  accountsById: Record<string, AccountProfile>
  activeAccountId: string
  addAccount: (input: AddAccountInput) => Promise<unknown>
  editAccount: (input: EditAccountInput) => Promise<unknown>
  removeAccount: (accountId: string) => Promise<boolean>
  selectAccount: (accountId: string) => void
}

export function AccountSwitcherView({
  accountsById,
  activeAccountId,
  addAccount,
  editAccount,
  removeAccount,
  selectAccount,
}: AccountSwitcherViewProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const accounts = Object.values(accountsById)
  const activeAccount = accountsById[activeAccountId]

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel htmlFor="active-account-select">
            Active account
          </InputLabel>
          <Select
            native
            label="Active account"
            value={activeAccountId}
            inputProps={{
              id: 'active-account-select',
            }}
            onChange={(event) => selectAccount(String(event.target.value))}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {formatAccountOption(account)}
              </option>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={<Icon>person_add</Icon>}
          onClick={() => setAddDialogOpen(true)}
        >
          Add account
        </Button>
        <Button
          variant="outlined"
          startIcon={<Icon>edit</Icon>}
          onClick={() => setEditDialogOpen(true)}
          disabled={!activeAccount}
        >
          Edit account
        </Button>
      </Box>
      <Dialog
        open={addDialogOpen}
        fullWidth
        maxWidth="sm"
        onClose={() => setAddDialogOpen(false)}
      >
        <DialogTitle>Add account</DialogTitle>
        <DialogContent>
          <AccountSetupView
            addAccount={addAccount}
            title="Add another GitHub account"
            submitLabel="Add account"
            onAdded={() => setAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={editDialogOpen}
        fullWidth
        maxWidth="sm"
        onClose={() => setEditDialogOpen(false)}
      >
        <DialogTitle>Edit account</DialogTitle>
        <DialogContent>
          {activeAccount ? (
            <AccountEditView
              account={activeAccount}
              addAccount={addAccount}
              editAccount={editAccount}
              removeAccount={removeAccount}
              onSaved={() => setEditDialogOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

function formatAccountOption(account: AccountProfile) {
  return formatAccountName(account)
}
