import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from '@material-ui/core'
import React from 'react'
import { create, InstanceProps } from 'react-modal-promise'

type ConfirmDialogProps = InstanceProps<boolean> & {
  message: string
}

const ConfirmDialog = ({ isOpen, onResolve, message }: ConfirmDialogProps) => {
  return (
    <Dialog open={isOpen} onClose={() => onResolve(false)}>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => onResolve(true)}>
          Ok
        </Button>
        <Button onClick={() => onResolve(false)}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

const _showConfirm = create(ConfirmDialog)

export const showConfirm = (message: string) => _showConfirm({ message })
