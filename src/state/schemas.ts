import { v4 as uuid } from 'uuid'
import { z } from 'zod'

export const appSettingsSchema = z.object({
  deployTimeoutSecs: z.number(),
  refreshIntervalSecs: z.number(),
  workflowRuns: z.number(),
})

export interface AppSettings extends z.infer<typeof appSettingsSchema> {}

export const repoSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  defaultBranch: z.string(),
})
export interface RepoModel extends z.infer<typeof repoSchema> {}

export const deploySettingsSchema = z.object({
  type: z.literal('workflow'),
  environmentKey: z.string(),
  releaseKey: z.string(),
  workflowId: z.number(),
  ref: z.string(),
  extraArgs: z.record(z.string()),
})
export interface DeploySettings extends z.infer<typeof deploySettingsSchema> {}
export const createDeploySettings = ({
  workflowId = 0,
  ref,
}: {
  workflowId?: number
  ref: string
}): DeploySettings => ({
  type: 'workflow',
  environmentKey: 'environment',
  releaseKey: 'ref',
  workflowId,
  ref,
  extraArgs: {},
})
export const deploySettingsByRpoSchema = z.record(deploySettingsSchema)

export const enviromentSettingsSchema = z.object({
  name: z.string(),
  workflowInputValue: z.string(),
})
export interface EnvironmentSettings
  extends z.infer<typeof enviromentSettingsSchema> {}

export const applicationConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  releaseFilter: z.string(),
  repo: repoSchema,
  deploySettings: deploySettingsSchema,
  environmentSettingsByName: z.record(enviromentSettingsSchema),
})
export interface ApplicationConfig
  extends z.infer<typeof applicationConfigSchema> {}
export const createApplicationConfig = (
  repo: RepoModel,
  name: string,
  releaseFilter: string
): ApplicationConfig => ({
  id: uuid(),
  name: name || repo.name,
  releaseFilter,
  environmentSettingsByName: {},
  repo,
  deploySettings: createDeploySettings({ ref: repo.defaultBranch }),
})
export const applicationsByIdSchema = z.record(applicationConfigSchema)

export const workflowRunSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string(),
  created_at: z.string(),
  conclusion: z.union([z.string(), z.null()]),
  run_number: z.number(),
  html_url: z.string(),
})
export interface WorkflowRun extends z.infer<typeof workflowRunSchema> {}
export const workflowRunsSchema = z.array(workflowRunSchema)

export const githubEnvironmentSchema = z.object({
  name: z.string(),
})
export interface GitHubEnvironment
  extends z.infer<typeof githubEnvironmentSchema> {}
export const githubEnvironmentsSchema = z.array(githubEnvironmentSchema)

export const pendingDeploymentSchema = z.object({
  createdAt: z.string(),
  workflowRunId: z.number().optional(),
})
export interface PendingDeployment
  extends z.infer<typeof pendingDeploymentSchema> {}
export const pendingDeploymentsSchema = z.record(pendingDeploymentSchema)
