import { IConfiguration } from 'overmind'

export function createConfig<ThisConfig extends IConfiguration>(
  config: ThisConfig
) {
  return config
}

export function getDeploymentId({
  release,
  environment,
  owner,
  repo,
}: {
  release: string
  environment: string
  owner: string
  repo: string
}) {
  return `${owner}/${repo}/${environment}/${release}`
}
