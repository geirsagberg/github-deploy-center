import { GraphQLClient } from 'graphql-request'
import { getSdk } from '../generated/graphql'

const githubGraphQLApiUrl = 'https://api.github.com/graphql'

const graphQLClient = new GraphQLClient(githubGraphQLApiUrl)

const graphQLApi = {
  ...getSdk(graphQLClient),
  setToken: (token: string) =>
    graphQLClient.setHeader('Authorization', 'Bearer ' + token),
}

export default graphQLApi
