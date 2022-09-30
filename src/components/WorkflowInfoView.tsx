import { Icon, Link, Typography } from '@material-ui/core'
import React from 'react'
import { useFetchWorkflows } from '../api/fetchHooks'
import { useAppState } from '../overmind'
import { DeployWorkflowCodec } from '../overmind/state'

const WorkflowInfoView = () => {
  const { selectedApplication } = useAppState()
  const workflows = useFetchWorkflows()

  if (
    !selectedApplication ||
    !DeployWorkflowCodec.is(selectedApplication.deploySettings) ||
    !selectedApplication.deploySettings.workflowId ||
    !workflows.data
  ) {
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
    <Typography>
      Selected workflow:{' '}
      <Link
        target="_blank"
        href={`https://github.com/${repo.owner}/${repo.name}/actions/workflows/${workflow.path}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {workflow.name} to {ref}
        <Icon style={{ fontSize: '1rem', margin: '0 0.25rem' }}>launch</Icon>
      </Link>
    </Typography>
  )
}

export default WorkflowInfoView
