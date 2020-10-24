import { IConfiguration } from 'overmind'

export function createConfig<ThisConfig extends IConfiguration>(
  config: ThisConfig
) {
  return config
}
