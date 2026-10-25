import { deactivatePreviousDeployments } from './deactivate.mjs'

try {
  const count = await deactivatePreviousDeployments({
    currentDeploymentId: process.env['INPUT_CURRENT-DEPLOYMENT-ID'],
    token: process.env.INPUT_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    apiUrl: process.env.GITHUB_API_URL,
    graphqlUrl: process.env.GITHUB_GRAPHQL_URL,
  })
  console.log(`Deactivated ${count} previous deployment(s).`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
