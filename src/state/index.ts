import { mapValues } from 'lodash-es'
import { atom, selector } from 'recoil'
import { AppSettings, appSettingsSchema } from './schemas'

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

export const appSettingsState = atom({
  default: defaultAppSettings,
  key: 'appSettings',
  effects: [
    ({ onSet, setSelf }) => {
      const storedJson = localStorage.getItem('appSettings')
      if (storedJson) {
        try {
          const appSettings = appSettingsSchema.parse(JSON.parse(storedJson))
          setSelf(appSettings)
        } catch (error) {
          console.log(error)
        }
      }
      onSet((newValue) => {
        localStorage.setItem('appSettings', JSON.stringify(newValue))
      })
    },
  ],
})

export const appSettings = mapValues(defaultAppSettings, (_, key) =>
  selector({
    key,
    get: ({ get }) =>
      get(appSettingsState)[key as keyof typeof defaultAppSettings],
    set: ({ set, get }, newValue) =>
      set(appSettingsState, {
        ...get(appSettingsState),
        [key]: newValue,
      }),
  })
)
