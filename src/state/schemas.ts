import { z } from 'zod'

export const appSettingsSchema = z.object({
  deployTimeoutSecs: z.number(),
  refreshIntervalSecs: z.number(),
  workflowRuns: z.number(),
})

export interface AppSettings extends z.infer<typeof appSettingsSchema> {}
