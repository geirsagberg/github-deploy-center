import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { create } from 'react-modal-promise'
import type { InstanceProps } from 'react-modal-promise'

export type ConfirmDialogDetail = {
  label: string
  value: string
}

export type ConfirmDialogOptions = {
  confirmLabel?: string
  details?: ConfirmDialogDetail[]
  message?: string
  title?: string
  warning?: string
}

type ConfirmDialogProps = InstanceProps<boolean> & ConfirmDialogOptions

const ConfirmDialog = ({
  confirmLabel = 'Ok',
  details = [],
  isOpen,
  message,
  onResolve,
  title,
  warning,
}: ConfirmDialogProps) => {
  return (
    <Dialog
      open={isOpen}
      fullWidth={!!details.length}
      maxWidth={details.length ? 'xs' : 'sm'}
      onClose={() => onResolve(false)}
    >
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        <Stack spacing={2}>
          {message && <DialogContentText>{message}</DialogContentText>}
          {!!details.length && (
            <Box
              component="dl"
              sx={{
                m: 0,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {details.map((detail, index) => (
                <Box
                  key={detail.label}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '7rem minmax(0, 1fr)',
                    gap: 2,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'action.hover',
                    borderTop: index ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    component="dt"
                    variant="caption"
                    color="text.secondary"
                    sx={{ alignSelf: 'center' }}
                  >
                    {detail.label}
                  </Typography>
                  <Typography
                    component="dd"
                    variant="body2"
                    sx={{ m: 0, overflowWrap: 'anywhere' }}
                  >
                    {detail.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {warning && <Alert severity="warning">{warning}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          autoFocus
          onClick={() => onResolve(true)}
        >
          {confirmLabel}
        </Button>
        <Button onClick={() => onResolve(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

const _showConfirm = create(ConfirmDialog)

export const showConfirm = (options: string | ConfirmDialogOptions) =>
  _showConfirm(typeof options === 'string' ? { message: options } : options)
