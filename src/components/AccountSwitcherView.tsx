import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  Icon,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material'
import type { MouseEvent } from 'react'
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const accounts = Object.values(accountsById)
  const activeAccount = accountsById[activeAccountId]
  const activeAccountName = activeAccount
    ? formatAccountName(activeAccount)
    : 'Account'
  const menuOpen = !!menuAnchor

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleAccountSelect = (accountId: string) => {
    if (accountId !== activeAccountId) {
      selectAccount(accountId)
    }
    handleMenuClose()
  }

  const handleAddAccount = () => {
    handleMenuClose()
    setAddDialogOpen(true)
  }

  const handleEditAccount = () => {
    handleMenuClose()
    setEditDialogOpen(true)
  }

  return (
    <>
      <Button
        size="small"
        color="inherit"
        endIcon={<Icon>expand_more</Icon>}
        aria-label={`Active account: ${activeAccountName}`}
        aria-controls={menuOpen ? 'account-switcher-menu' : undefined}
        aria-haspopup="menu"
        aria-expanded={menuOpen ? 'true' : undefined}
        onClick={handleMenuOpen}
        sx={{
          minWidth: 0,
          maxWidth: { xs: '9rem', sm: '14rem' },
          color: 'text.secondary',
          fontWeight: 400,
          textTransform: 'none',
          '.MuiButton-endIcon': { ml: 0.25 },
        }}
      >
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeAccountName}
        </Box>
      </Button>
      <Menu
        id="account-switcher-menu"
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {accounts.map((account) => {
          const accountName = formatAccountOption(account)
          const selected = account.id === activeAccountId

          return (
            <MenuItem
              key={account.id}
              selected={selected}
              disabled={selected}
              aria-current={selected ? 'true' : undefined}
              onClick={() => handleAccountSelect(account.id)}
            >
              {selected ? (
                <ListItemIcon>
                  <Icon fontSize="small">check</Icon>
                </ListItemIcon>
              ) : null}
              <ListItemText inset={!selected} primary={accountName} />
            </MenuItem>
          )
        })}
        <Divider />
        <MenuItem onClick={handleEditAccount} disabled={!activeAccount}>
          <ListItemIcon>
            <Icon fontSize="small">edit</Icon>
          </ListItemIcon>
          <ListItemText primary="Edit account" />
        </MenuItem>
        <MenuItem onClick={handleAddAccount}>
          <ListItemIcon>
            <Icon fontSize="small">person_add</Icon>
          </ListItemIcon>
          <ListItemText primary="Add account" />
        </MenuItem>
      </Menu>
      <Dialog
        open={addDialogOpen}
        fullWidth
        maxWidth="sm"
        onClose={() => setAddDialogOpen(false)}
      >
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
    </>
  )
}

function formatAccountOption(account: AccountProfile) {
  return formatAccountName(account)
}
