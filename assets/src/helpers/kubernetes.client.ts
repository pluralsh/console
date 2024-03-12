import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { RestLink } from 'apollo-link-rest'

import { fetchToken } from './auth'

const K8S_API_URL = '/api/v1/'
const CLIENT_MAP = new Map<string, ApolloClient<any>>()

function KubernetesClient(clusterID: string): ApolloClient<any> | undefined {
  if (!clusterID) {
    return undefined
  }

  if (CLIENT_MAP.has(clusterID)) {
    return CLIENT_MAP.get(clusterID)!
  }

  const client = buildClient({ clusterID, fetchToken })

  CLIENT_MAP.set(clusterID, client)

  return client
}

function buildClient({ clusterID, fetchToken }) {
  const restLink = new RestLink({ uri: K8S_API_URL })

  const authRestLink = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers }) => {
      const token = fetchToken()

      return {
        headers: {
          ...headers,
          Authorization: `Bearer plrl:${clusterID}:${token}`,
        },
      }
    })

    return forward(operation)
  })

  return new ApolloClient({
    link: ApolloLink.from([authRestLink, restLink]),
    cache: new InMemoryCache(),
  })
}

export { KubernetesClient }
