import {
  Alert,
  CircularProgress,
  FormControl,
  FormControlProps,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { useFetchWorkflows } from '../api/fetchHooks'
import { useAppState } from '../overmind'

enum WorkflowRelevance {
  None = 0,
  Deploy = 1,
  Name = 2,
  NameAndDeploy = 3,
}

export function SelectWorkflow({
  workflowId,
  onChange,
  FormControlProps = {},
}: {
  workflowId: number
  onChange: (workflowId: number) => void
  FormControlProps?: FormControlProps
}) {
  const workflows = useFetchWorkflows()
  const { selectedApplication } = useAppState()

  if (!selectedApplication) return null

  if (workflows.error) {
    return <Alert severity="error">Could not load workflows</Alert>
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
      {workflows.isLoading ? (
        <CircularProgress />
      ) : workflows.data ? (
        <Select
          labelId="workflow-select-label"
          id="workflow-select"
          value={workflowId}
          label="Workflow"
          onChange={(e) => {
            const workflowId =
              typeof e.target.value === 'number'
                ? (e.target.value as number)
                : 0
            onChange(workflowId)
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
      ) : null}
    </FormControl>
  )
}
