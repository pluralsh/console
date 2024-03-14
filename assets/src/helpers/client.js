import { ApolloClient, InMemoryCache } from '@apollo/client'
import { IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'
import { setContext } from 'apollo-link-context'
import { createLink } from 'apollo-absinthe-upload-link'
import { onError } from 'apollo-link-error'
import * as AbsintheSocket from '@absinthe/socket'
import { Socket as PhoenixSocket } from 'phoenix'
import { createAbsintheSocketLink } from 'pluralsh-absinthe-socket-apollo-link'
import { RetryLink } from 'apollo-link-retry'
import { hasSubscription } from '@jumpn/utils-graphql'
import { split } from 'apollo-link'

import introspection from '../generated/fragments.json'

import { onErrorHandler, onNetworkError } from './refreshToken'

import customFetch from './uploadLink'
import { fetchToken } from './auth'

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData: introspection,
})

const GQL_URL = '/gql'
const WS_URI = '/socket'

export const authlessClient = new ApolloClient({
  link: createLink({ uri: GQL_URL }),
  cache: new InMemoryCache(),
})

export function buildClient(gqlUrl, wsUrl, onNetworkError, fetchToken) {
  const httpLink = createLink({ uri: gqlUrl, fetch: customFetch })

  const authLink = setContext((_, { headers }) => {
    const token = fetchToken()
    const authHeaders = token ? { authorization: `Bearer ${token}` } : {}

    return { headers: { ...headers, ...authHeaders } }
  })

  const errorLink = onError(onErrorHandler)

  const retryLink = new RetryLink({
    delay: { initial: 200, max: 5000 },
    attempts: {
      max: Infinity,
      retryIf: (error) => !!error && !!fetchToken(),
    },
  })

  const socket = new PhoenixSocket(wsUrl, {
    params: () => {
      const token = fetchToken()

      return token ? { Authorization: `Bearer ${token}` } : {}
    },
  })

  const absintheSocket = AbsintheSocket.create(socket)

  const socketLink = createAbsintheSocketLink(absintheSocket)
  const gqlLink = errorLink.concat(httpLink)

  const splitLink = split(
    (operation) => hasSubscription(operation.query),
    socketLink,
    authLink.concat(retryLink).concat(gqlLink)
  )

  const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({
      fragmentMatcher,
      typePolicies: {
        Command: {
          fields: {
            exitCode: {
              merge(code, incoming) {
                if (code || code === 0) return code

                return incoming
              },
            },
          },
        },
      },
    }),
  })

  return { client, socket }
}

const { client, socket } = buildClient(
  GQL_URL,
  WS_URI,
  onNetworkError,
  fetchToken
)

export { client, socket }
