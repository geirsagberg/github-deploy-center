import {
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { FC } from 'react'
import { useOvermindState } from '../overmind'
import { useFetchDeployments, useFetchReleases } from './fetchHooks'
import { ReleasesTableView } from './ReleasesTableView'
import { WorkflowDeploySettingsView } from './WorkflowDeploySettingsView'

export const RepoView: FC = () => {
  const { selectedRepo, deploySettingsForSelectedRepo } = useOvermindState()

  const releaseResults = useFetchReleases()
  const deploymentResults = useFetchDeployments()

  if (!selectedRepo || !deploySettingsForSelectedRepo) return null
  return (
    <>
      <Typography variant="h3">{selectedRepo.name}</Typography>
      <Typography variant="h4">How to deploy</Typography>
      <FormControl component="fieldset">
        <FormLabel component="legend">Deploy type</FormLabel>
        <RadioGroup
          aria-label="Deploy type"
          name="deploy-type"
          value={deploySettingsForSelectedRepo.type}>
          <FormControlLabel
            value="workflow"
            control={<Radio />}
            label="Trigger `workflow_dispatch` GitHub Action workflow"
          />
          <FormControlLabel
            value="deployment"
            control={<Radio />}
            label="Create GitHub Deployment (coming soon)"
            disabled
          />
        </RadioGroup>
      </FormControl>
      {deploySettingsForSelectedRepo.type === 'workflow' && (
        <WorkflowDeploySettingsView />
      )}
      <Typography variant="h4">Deployments</Typography>
      {releaseResults.error instanceof Error && (
        <Alert severity="error">{releaseResults.error.message}</Alert>
      )}
      {deploymentResults.error instanceof Error && (
        <Alert severity="error">{deploymentResults.error.message}</Alert>
      )}
      <ReleasesTableView />
      {releaseResults.isLoading || deploymentResults.isLoading ? (
        <CircularProgress />
      ) : null}
    </>
  )
}
