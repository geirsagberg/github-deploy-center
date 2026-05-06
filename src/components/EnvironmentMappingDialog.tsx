import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material'
import type { FC } from 'react'
import { useActions, useAppState } from '../store'
import type { EnvironmentMappingDialogState } from '../store'

type EnvironmentMappingDialogSnapshot = {
  mappings: readonly {
    enabled: boolean
    environmentName: string
  }[]
}

export const EnvironmentMappingDialog: FC = () => {
  const { environmentMappingDialog } = useAppState()
  const {
    cancelEnvironmentMappings,
    saveEnvironmentMappings,
    updateEnvironmentMappingDialog,
  } = useActions()
  const duplicateEnvironmentNames = getDuplicateEnabledEnvironmentNames(
    environmentMappingDialog,
  )
  const hasBlankEnabledMapping =
    environmentMappingDialog?.mappings.some(
      (mapping) => mapping.enabled && !mapping.environmentName.trim(),
    ) ?? false
  const canSave =
    !!environmentMappingDialog &&
    !hasBlankEnabledMapping &&
    duplicateEnvironmentNames.length === 0

  const updateMapping = (
    id: string,
    update: (
      mapping: EnvironmentMappingDialogState['mappings'][number],
    ) => void,
  ) =>
    updateEnvironmentMappingDialog({
      update: (state) => {
        const mapping = state.mappings.find((mapping) => mapping.id === id)
        if (mapping) update(mapping)
      },
    })

  return (
    <Dialog
      open={!!environmentMappingDialog}
      fullWidth
      maxWidth="md"
      onClose={cancelEnvironmentMappings}
    >
      {environmentMappingDialog ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSave) saveEnvironmentMappings()
          }}
        >
          <DialogTitle>Register environments?</DialogTitle>
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Alert severity="info">
              Review the suggested mappings for{' '}
              {environmentMappingDialog.applicationName}. They connect GitHub
              environment labels to the workflow choice value; additional
              environments can be added later.
            </Alert>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 720, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 72 }}>Use</TableCell>
                    <TableCell sx={{ width: 120 }}>Choice</TableCell>
                    <TableCell>GitHub environment</TableCell>
                    <TableCell>Workflow input</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {environmentMappingDialog.mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <Tooltip
                          title={
                            mapping.enabled
                              ? 'Include this mapping'
                              : 'Skip this mapping'
                          }
                        >
                          <Checkbox
                            checked={mapping.enabled}
                            slotProps={{
                              input: {
                                'aria-label': `Enable ${mapping.workflowChoice}`,
                              },
                            }}
                            onChange={(event) =>
                              updateMapping(
                                mapping.id,
                                (state) =>
                                  (state.enabled = event.target.checked),
                              )
                            }
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color="secondary"
                          label={mapping.workflowChoice}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={!mapping.enabled}
                          fullWidth
                          label={`Environment for ${mapping.workflowChoice}`}
                          value={mapping.environmentName}
                          size="small"
                          helperText={
                            mapping.existingEnvironmentName
                              ? 'Existing in GitHub'
                              : 'Suggested name'
                          }
                          onChange={(event) =>
                            updateMapping(
                              mapping.id,
                              (state) =>
                                (state.environmentName = event.target.value),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          disabled={!mapping.enabled}
                          fullWidth
                          label={`Workflow input for ${mapping.workflowChoice}`}
                          value={mapping.workflowInputValue}
                          size="small"
                          placeholder="Defaults to environment name"
                          onChange={(event) =>
                            updateMapping(
                              mapping.id,
                              (state) =>
                                (state.workflowInputValue =
                                  event.target.value),
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {hasBlankEnabledMapping ? (
              <Alert severity="warning">
                Enabled mappings need an environment name.
              </Alert>
            ) : null}
            {duplicateEnvironmentNames.length ? (
              <Alert severity="warning">
                Each enabled mapping needs a unique environment name.
              </Alert>
            ) : null}
          </DialogContent>
          <Box sx={{ p: 2, pt: 1 }}>
            <DialogActions>
              <Button
                type="submit"
                disabled={!canSave}
                variant="contained"
                color="primary"
              >
                Save mappings
              </Button>
              <Button onClick={cancelEnvironmentMappings}>Skip</Button>
            </DialogActions>
          </Box>
        </form>
      ) : null}
    </Dialog>
  )
}

function getDuplicateEnabledEnvironmentNames(
  dialogState?: EnvironmentMappingDialogSnapshot,
) {
  const seenNames = new Set<string>()
  const duplicateNames = new Set<string>()

  for (const mapping of dialogState?.mappings ?? []) {
    const environmentName = mapping.environmentName.trim().toLowerCase()

    if (!mapping.enabled || !environmentName) continue
    if (seenNames.has(environmentName)) {
      duplicateNames.add(environmentName)
    }
    seenNames.add(environmentName)
  }

  return [...duplicateNames]
}
