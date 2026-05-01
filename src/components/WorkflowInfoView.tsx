import { Icon, Link, Typography } from '@mui/material'
import type { LinkProps } from '@mui/material'
import { useFetchWorkflows } from '../api/fetchHooks'
import { useAppState } from '../store'
import { CredentialErrorAlert } from './CredentialErrorAlert'

const ExternalLink = ({ children, ...props }: LinkProps) => (
  <Link
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
    }}
  >
    {children}
    <Icon style={{ fontSize: '1rem', margin: '0 0.25rem' }}>launch</Icon>
  </Link>
)

const WorkflowInfoView = () => {
  const { selectedApplication } = useAppState()
  const workflows = useFetchWorkflows()

  if (workflows.error) {
    return <CredentialErrorAlert title="Could not load workflows" />
  }

  if (!selectedApplication?.deploySettings?.workflowId || !workflows.data) {
    return null
  }

  const {
    deploySettings: { workflowId, ref },
    repo,
  } = selectedApplication

  const workflow = workflows.data.find((w) => w.id === workflowId)

  if (!workflow) {
    return null
  }

  return (
    <>
      <Typography>
        Selected workflow:{' '}
        <ExternalLink
          href={`https://github.com/${repo.owner}/${repo.name}/actions/workflows/${workflow.path}`}
        >
          {workflow.name} to {ref}
        </ExternalLink>
      </Typography>
    </>
  )
}

export default WorkflowInfoView
