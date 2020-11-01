import { createOvermind, IConfig } from 'overmind'
import {
  createActionsHook,
  createEffectsHook,
  createHook,
  createReactionHook,
  createStateHook,
} from 'overmind-react'
import * as actions from './actions'
import * as effects from './effects'
import onInitialize from './onInitialize'
import state from './state'
import { createConfig } from './utils'

const config = createConfig({
  state,
  onInitialize,
  actions,
  effects,
})

declare module 'overmind' {
  interface Config extends IConfig<typeof config> {}
}

export const useOvermind = createHook()
export const useOvermindState = createStateHook()
export const useActions = createActionsHook()
export const useEffects = createEffectsHook()
export const useReaction = createReactionHook()

export const overmind = createOvermind(config)
