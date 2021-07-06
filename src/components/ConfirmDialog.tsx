import { Dialog, DialogContent } from '@material-ui/core'
import React, { useState } from 'react'
import { render } from 'react-dom'

export const ConfirmDialog = () => {
  const [open, setOpen] = useState(true)
  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogContent>Hello</DialogContent>
    </Dialog>
  )
}

export const showConfirm = () => {
  const div = document.createElement('div')
  document.body.appendChild(div)
  render(<ConfirmDialog />, div)
}
