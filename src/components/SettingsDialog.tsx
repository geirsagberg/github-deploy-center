import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { appSettingsDescription, defaultAppSettings } from '../state'
import { useActions, useAppState } from '../store'
import type { AppSettings } from '../state/schemas'
import { keysOf } from '../utils'

interface EditorProps {
  setting: keyof AppSettings
}

function Editor({ setting }: EditorProps) {
  const { settings } = useAppState()
  const { setAppSetting } = useActions()
  const value = settings[setting]
  const label = appSettingsDescription[setting]
  if (typeof value === 'string') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setAppSetting(setting, e.target.value as any)}
        fullWidth
      />
    )
  }
  if (typeof value === 'number') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setAppSetting(setting, +e.target.value as any)}
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
      <DialogContent
        sx={{
          gap: '1rem',
          display: 'grid',
          padding: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
        }}>
        {keysOf(defaultAppSettings).map((key) => (
          <Editor key={key} setting={key} />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={hideSettings}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
