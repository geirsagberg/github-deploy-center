import { Button, Typography } from '@mui/material'
import { useActions, useAppState } from '../overmind'
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

  if (!selectedApplication?.deploySettings?.workflowId) {
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
