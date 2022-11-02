import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import React from 'react'
import { useActions, useAppState } from '../overmind'
import { AppState } from '../overmind/state'

interface EditorProps<T> {
  selector: (state: AppState) => T
  label: string
}

function Editor<T>({ selector, label }: EditorProps<T>) {
  const state = useAppState()
  const value = selector(state)
  const { setState } = useActions()
  if (typeof value === 'string') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setState({ selector, value: e.target.value })}
        fullWidth
      />
    )
  }
  if (typeof value === 'number') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setState({ selector, value: +e.target.value })}
        type="number"
        fullWidth
      />
    )
  }
  return <div></div>
}

export const SettingsDialog = () => {
  const { settingsDialog } = useAppState()
  const { hideSettings } = useActions()
  return (
    <Dialog open={!!settingsDialog} fullWidth onClose={hideSettings}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent style={{ gap: '1rem', display: 'flex' }}>
        <Editor
          label="Deploy timeout (secs)"
          selector={(state) => state.appSettings.deployTimeoutSecs}
        />
        <Editor
          label="Status refresh interval (secs)"
          selector={(state) => state.appSettings.refreshIntervalSecs}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={hideSettings}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
