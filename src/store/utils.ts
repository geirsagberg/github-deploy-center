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
