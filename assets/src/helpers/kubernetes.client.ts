import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { RestLink } from 'apollo-link-rest'

import { Unstructured_Unstructured as UnstructuredT } from '../generated/graphql-kubernetes'

import { fetchToken } from './auth'

const K8S_API_URL = '/api/v1/'
const CLIENT_MAP = new Map<string, ApolloClient<any>>()
// Ref: https://github.com/apollographql/apollo-link-rest/issues/107
const RAW_EMPTY_RESPONSE_ERROR = 'Unexpected end of JSON input'

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
  const restLink = new RestLink({
    uri: K8S_API_URL,
    responseTransformer: async (response: Response) => {
      const isRawUrl = response.url.includes(`${K8S_API_URL}_raw`)
      let body: any

      try {
        body = await (response as Response).json()
      } catch (e) {
        const err = e as Error

        if (
          !isRawUrl ||
          (isRawUrl && !err?.message?.includes(RAW_EMPTY_RESPONSE_ERROR))
        ) {
          throw e
        }
      }

      return isRawUrl ? ({ Object: body } as UnstructuredT) : body
    },
  })

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
