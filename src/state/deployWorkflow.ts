import {
  getEnvironmentChoiceOptions,
  type DeployWorkflowInputs,
  type WorkflowDispatchInputs,
} from '../api/workflowDispatch'
import type { DeploySettings } from './schemas'

const DEFAULT_RELEASE_KEY = 'ref'
const DEFAULT_ENVIRONMENT_KEY = 'environment'

type DeployWorkflowMetadata = {
  id: number
  deployInputs?: DeployWorkflowInputs
  dispatchInputs?: WorkflowDispatchInputs
}

export type DeploymentDialogState = DeploySettings & {
  dispatchInputs?: WorkflowDispatchInputs
}

export function selectDeployWorkflow(
  state: DeploymentDialogState,
  workflow: DeployWorkflowMetadata | null,
) {
  state.workflowId = workflow?.id ?? 0
  state.dispatchInputs = workflow?.dispatchInputs

  if (!workflow) return

  const deployInputs = state.manualWorkflowHandling
    ? undefined
    : workflow.deployInputs

  if (shouldReplaceWithInference(state.releaseKey, DEFAULT_RELEASE_KEY)) {
    state.releaseKey = deployInputs?.releaseKey ?? DEFAULT_RELEASE_KEY
  }

  if (
    shouldReplaceWithInference(state.environmentKey, DEFAULT_ENVIRONMENT_KEY)
  ) {
    state.environmentKey =
      deployInputs?.environmentKey ?? DEFAULT_ENVIRONMENT_KEY
  }
}

export function updateDeployWorkflowMetadata(
  state: DeploymentDialogState,
  workflow: DeployWorkflowMetadata,
) {
  if (state.workflowId === workflow.id) {
    state.dispatchInputs = workflow.dispatchInputs
  }
}

export function updateManualWorkflowHandling(
  state: DeploymentDialogState,
  manualWorkflowHandling: boolean,
) {
  state.manualWorkflowHandling = manualWorkflowHandling
  state.workflowId = 0
  state.dispatchInputs = undefined
}

export function toPersistedDeploySettings({
  dispatchInputs: _dispatchInputs,
  extraArgs,
  ...deploySettings
}: DeploymentDialogState): DeploySettings {
  return {
    ...deploySettings,
    extraArgs: { ...extraArgs },
  }
}

export function getDeployEnvironmentChoices(
  deploySettings: DeploymentDialogState,
) {
  return getEnvironmentChoiceOptions(
    deploySettings.dispatchInputs,
    deploySettings.environmentKey,
  )
}

function shouldReplaceWithInference(value: string, defaultValue: string) {
  return !value || value === defaultValue
}
