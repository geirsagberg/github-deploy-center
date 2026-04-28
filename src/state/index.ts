import { AppSettings } from './schemas'

export const defaultAppSettings: AppSettings = {
  deployTimeoutSecs: 60,
  refreshIntervalSecs: 60,
  workflowRuns: 100,
}

export const appSettingsDescription: Record<keyof AppSettings, string> = {
  deployTimeoutSecs: 'Deploy timeout (seconds)',
  refreshIntervalSecs: 'Status refresh interval (seconds)',
  workflowRuns: 'Number of deploy runs to fetch (max 100)',
}
