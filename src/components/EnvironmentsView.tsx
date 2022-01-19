import {
  Button,
  Typography
} from '@material-ui/core'
import React from 'react'
import { useActions, useAppState } from '../overmind'
import {
  DeployWorkflowCodec
} from '../overmind/state'
import { EnvironmentDialog } from './EnvironmentDialog'

const AddEnvironmentDialog = () => {
  const { addEnvironmentDialog } = useAppState()
  const { cancelAddEnvironment, addEnvironment, updateEnvironmentDialog } =
    useActions()
  return (
    <EnvironmentDialog
      dialogState={addEnvironmentDialog}
      onCancel={cancelAddEnvironment}
      onSave={addEnvironment}
      title="Add environment"
      updateDialogState={(update) =>
        updateEnvironmentDialog({ addOrEdit: 'add', update })
      }
    />
  )
}

export const EnvironmentsView = () => {
  const { selectedApplication } = useAppState()
  const { showAddEnvironmentModal } = useActions()

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings) ||
    !selectedApplication.deploySettings.workflowId
  ) {
    return null
  }

  return (
    <>
      <Typography variant="h4">Environments</Typography>
      <Button variant="contained" onClick={showAddEnvironmentModal}>
        Add environment
      </Button>
      <AddEnvironmentDialog />
    </>
  )
}
