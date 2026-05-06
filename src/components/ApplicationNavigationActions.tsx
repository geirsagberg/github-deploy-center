import {
  Box,
  Button,
  Icon,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import type { MouseEvent } from 'react'
import { useState } from 'react'
import { useActions } from '../store'

export function ApplicationNavigationActions() {
  const { exportApplications, importApplications, showNewApplicationModal } =
    useActions()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const menuOpen = !!menuAnchor

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const handleExport = () => {
    handleMenuClose()
    void exportApplications()
  }

  const handleImport = () => {
    handleMenuClose()
    void importApplications()
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
      <Button
        fullWidth
        variant="contained"
        color="primary"
        startIcon={<Icon>add</Icon>}
        onClick={showNewApplicationModal}
        sx={{ justifyContent: 'flex-start' }}
      >
        New Config
      </Button>
      <Tooltip title="Application actions">
        <IconButton
          aria-label="Application actions"
          aria-controls={menuOpen ? 'application-actions-menu' : undefined}
          aria-haspopup="menu"
          aria-expanded={menuOpen ? 'true' : undefined}
          onClick={handleMenuOpen}
        >
          <Icon>more_vert</Icon>
        </IconButton>
      </Tooltip>
      <Menu
        id="application-actions-menu"
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <Icon fontSize="small">download</Icon>
          </ListItemIcon>
          <ListItemText primary="Export" />
        </MenuItem>
        <MenuItem onClick={handleImport}>
          <ListItemIcon>
            <Icon fontSize="small">upload</Icon>
          </ListItemIcon>
          <ListItemText primary="Import" />
        </MenuItem>
      </Menu>
    </Box>
  )
}
