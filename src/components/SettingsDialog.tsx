import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { useRecoilState } from 'recoil'
import { useActions, useAppState } from '../overmind'
import {
  appSettings,
  appSettingsDescription,
  defaultAppSettings,
} from '../state'
import { AppSettings } from '../state/schemas'
import { keysOf } from '../utils'

interface EditorProps {
  setting: keyof AppSettings
}

function Editor<T>({ setting }: EditorProps) {
  const [value, setValue] = useRecoilState(appSettings[setting])
  const label = appSettingsDescription[setting]
  if (typeof value === 'string') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value as any)}
        fullWidth
      />
    )
  }
  if (typeof value === 'number') {
    return (
      <TextField
        label={label}
        value={value}
        onChange={(e) => setValue(+e.target.value)}
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
