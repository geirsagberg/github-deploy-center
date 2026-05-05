import { Button, Typography } from '@mui/material'
import { useActions, useAppState } from '../store'
import { EnvironmentDialog } from './EnvironmentDialog'

const AddEnvironmentDialog = () => {
  const { addEnvironmentDialog } = useAppState()
  const { cancelAddEnvironment, addEnvironment, updateEnvironmentDialog } =
    useActions()
  return (
    <EnvironmentDialog
      autoMapWorkflowInputValue
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

const EditEnvironmentDialog = () => {
  const { editEnvironmentDialog, selectedApplication } = useAppState()
  const {
    cancelEditEnvironment,
    editEnvironment,
    removeEnvironment,
    updateEnvironmentDialog,
  } = useActions()
  const originalEnvironmentName =
    editEnvironmentDialog?.originalEnvironmentName ??
    editEnvironmentDialog?.environmentName

  return (
    <EnvironmentDialog
      dialogState={editEnvironmentDialog}
      existingEnvironmentNames={Object.keys(
        selectedApplication?.environmentSettingsByName ?? {},
      )}
      onCancel={cancelEditEnvironment}
      onDelete={
        originalEnvironmentName
          ? () => removeEnvironment(originalEnvironmentName)
          : undefined
      }
      onSave={editEnvironment}
      title="Edit environment"
      updateDialogState={(update) =>
        updateEnvironmentDialog({ addOrEdit: 'edit', update })
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
      <EditEnvironmentDialog />
    </>
  )
}
