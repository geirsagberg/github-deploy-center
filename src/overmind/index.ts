import { createOvermind, IConfig } from 'overmind'
import {
  createActionsHook,
  createEffectsHook,
  createHook,
  createReactionHook,
  createStateHook,
} from 'overmind-react'
import * as actions from './actions'
import onInitialize from './onInitialize'
import state from './state'
import { createConfig } from './utils'

const config = createConfig({
  state,
  onInitialize,
  actions,
})

declare module 'overmind' {
  interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook<typeof config>()
export const useOvermindState = createStateHook<typeof config>()
export const useActions = createActionsHook<typeof config>()
export const useEffects = createEffectsHook<typeof config>()
export const useReaction = createReactionHook<typeof config>()

export const overmind = createOvermind(config)
