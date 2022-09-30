import {
  Icon,
  Link,
  LinkProps,
  List,
  ListItem,
  Typography,
} from '@material-ui/core'
import dayjs from 'dayjs'
import { size } from 'lodash-es'
import React from 'react'
import { useFetchWorkflowRuns, useFetchWorkflows } from '../api/fetchHooks'
import { useAppState } from '../overmind'
import { DeployWorkflowCodec } from '../overmind/state'

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
  const runs = useFetchWorkflowRuns()

  console.log(runs)

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
    <>
      <Typography>
        Selected workflow:{' '}
        <ExternalLink
          href={`https://github.com/${repo.owner}/${repo.name}/actions/workflows/${workflow.path}`}
        >
          {workflow.name} to {ref}
        </ExternalLink>
      </Typography>
      {runs.data && size(runs.data) ? (
        <div>
          <Typography>Recent runs:</Typography>
          <List>
            {runs.data.map((run) => (
              <ListItem key={run.id}>
                <ExternalLink href={run.html_url}>
                  Run {run.run_number} - {dayjs(run.created_at).fromNow()} -{' '}
                  {run.status} - {run.conclusion}
                </ExternalLink>
              </ListItem>
            ))}
          </List>
        </div>
      ) : null}
    </>
  )
}

export default WorkflowInfoView
