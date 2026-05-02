import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import type { FormControlProps } from '@mui/material'
import { useFetchWorkflows } from '../api/fetchHooks'
import type { DispatchWorkflow } from '../api/fetchHooks'
import { useAppState } from '../store'
import { CredentialErrorAlert } from './CredentialErrorAlert'

enum WorkflowRelevance {
  None = 0,
  Deploy = 1,
  Name = 2,
  NameAndDeploy = 3,
}

export function SelectWorkflow({
  workflowId,
  manualWorkflowHandling,
  onChange,
  FormControlProps = {},
}: {
  workflowId: number
  manualWorkflowHandling?: boolean
  onChange: (workflow: DispatchWorkflow | null) => void
  FormControlProps?: FormControlProps
}) {
  const workflows = useFetchWorkflows({ manualWorkflowHandling })
  const { selectedApplication } = useAppState()

  if (!selectedApplication) return null

  if (workflows.error) {
    return <CredentialErrorAlert title="Could not load workflows" />
  }

  const workflowsSorted = (workflows.data ?? []).orderBy(
    [
      (workflow) => {
        const containsName = workflow.name
          .toLowerCase()
          .includes(selectedApplication.name.toLowerCase().split(' ')[0])
        const containsDeploy = workflow.name.toLowerCase().includes('deploy')
        return containsDeploy && containsName
          ? WorkflowRelevance.NameAndDeploy
          : containsName
          ? WorkflowRelevance.Name
          : containsDeploy
          ? WorkflowRelevance.Deploy
          : WorkflowRelevance.None
      },
      (w) => w.name,
    ],
    ['desc', 'asc']
  )
  return (
    <FormControl variant="outlined" {...FormControlProps}>
      <InputLabel id="workflow-select-label">Workflow</InputLabel>
      <Select
        labelId="workflow-select-label"
        id="workflow-select"
        value={workflowId}
        label="Workflow"
        disabled={workflows.isLoading}
        displayEmpty
        renderValue={(selectedWorkflowId) =>
          workflows.isLoading ? (
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
              }}
            >
              <CircularProgress size={18} />
              Loading workflows...
            </Box>
          ) : (
            workflowsSorted.find(
              (workflow) => workflow.id === selectedWorkflowId
            )?.name ?? <em>None</em>
          )
        }
        onChange={(e) => {
          const workflowId =
            typeof e.target.value === 'number'
              ? (e.target.value as number)
              : Number(e.target.value)
          onChange(
            workflowsSorted.find((workflow) => workflow.id === workflowId) ??
              null
          )
        }}
      >
        <MenuItem value={0}>
          <em>None</em>
        </MenuItem>
        {workflowsSorted.map((workflow) => (
          <MenuItem key={workflow.id} value={workflow.id}>
            {workflow.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
