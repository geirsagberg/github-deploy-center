import { createOvermind, IContext } from 'overmind'
import {
  createActionsHook,
  createEffectsHook,
  createReactionHook,
  createStateHook,
} from 'overmind-react'
import * as actions from './actions'
import * as effects from './effects'
import state from './state'

export const config = {
  state,
  actions,
  effects,
}

export type Context = IContext<typeof config>

export const useAppState = createStateHook<Context>()
export const useActions = createActionsHook<Context>()
export const useEffects = createEffectsHook<Context>()
export const useReaction = createReactionHook<Context>()

// We set the delimiter to something other than '.', to avoid errors if release strings include dots
// See e.g. https://github.com/cerebral/overmind/issues/441
export const overmind = createOvermind(config, { delimiter: '|' })
