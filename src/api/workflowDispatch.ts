import { parse } from 'yaml'

export type WorkflowDispatchInput = {
  type?: string
}

export type WorkflowDispatchInputs = Record<string, WorkflowDispatchInput>

export type WorkflowDispatchConfig = {
  inputs: WorkflowDispatchInputs
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseWorkflowDispatch(
  workflowFile: string
): WorkflowDispatchConfig | null {
  let workflow: unknown

  try {
    workflow = parse(workflowFile)
  } catch {
    return null
  }

  if (!isRecord(workflow)) return null

  const on = workflow.on

  if (on === 'workflow_dispatch') {
    return { inputs: {} }
  }

  if (Array.isArray(on)) {
    return on.includes('workflow_dispatch') ? { inputs: {} } : null
  }

  if (!isRecord(on) || !('workflow_dispatch' in on)) {
    return null
  }

  const dispatch = on.workflow_dispatch
  const inputs =
    isRecord(dispatch) && isRecord(dispatch.inputs)
      ? parseDispatchInputs(dispatch.inputs)
      : {}

  return { inputs }
}

export function inferReleaseInputName(
  inputs: WorkflowDispatchInputs
): string | undefined {
  const inputNames = Object.keys(inputs)

  return (
    findExactInput(inputNames, 'ref') ??
    findInputStartingWith(inputNames, ['release', 'tag', 'version'])
  )
}

export function inferEnvironmentInputName(
  inputs: WorkflowDispatchInputs
): string | undefined {
  const inputNames = Object.keys(inputs)

  return (
    inputNames.find(
      (name) => inputs[name]?.type?.toLowerCase() === 'environment'
    ) ??
    findExactInput(inputNames, 'environment') ??
    findExactInput(inputNames, 'env') ??
    findInputStartingWith(inputNames, ['environment', 'env', 'target'])
  )
}

function parseDispatchInputs(
  inputs: Record<string, unknown>
): WorkflowDispatchInputs {
  return Object.fromEntries(
    Object.entries(inputs).map(([name, input]) => [
      name,
      isRecord(input) ? parseDispatchInput(input) : {},
    ])
  )
}

function parseDispatchInput(
  input: Record<string, unknown>
): WorkflowDispatchInput {
  return {
    type: typeof input.type === 'string' ? input.type : undefined,
  }
}

function findExactInput(
  inputNames: string[],
  expectedName: string
): string | undefined {
  return inputNames.find((name) => name.toLowerCase() === expectedName)
}

function findInputStartingWith(
  inputNames: string[],
  prefixes: string[]
): string | undefined {
  return inputNames.find((name) =>
    prefixes.some((prefix) => name.toLowerCase().startsWith(prefix))
  )
}
