import { ApolloClient, InMemoryCache, split } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createLink } from 'apollo-absinthe-upload-link'
import { Socket as PhoenixSocket } from 'phoenix'
import { RetryLink } from '@apollo/client/link/retry'
import { hasSubscription } from '@jumpn/utils-graphql'

import fragments from '../generated/fragments.json'

import { onErrorHandler } from './refreshToken'

import customFetch from './uploadLink'
import { fetchToken } from './auth'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'

const GQL_URL = '/gql'
const WS_URI = '/socket'
const GQL_WS_URI = '/socket/gql-ws'

export const authlessClient = new ApolloClient({
  link: createLink({ uri: GQL_URL }),
  cache: new InMemoryCache(),
})

function maybeReconnect(socket) {
  if (socket.connectionState() === 'closed') {
    console.warn('found dead websocket, attempting a reconnect')
    if (!socket.conn) {
      console.warn('connecting websocket transport')
      socket.connect()
    } else if (socket.conn?.readyState === WebSocket.CLOSED) {
      console.warn('handling closed websocket')
      socket.reconnectTimer.reset()
      socket.reconnectTimer.scheduleTimeout()
    }

    return
  }
}

export function buildClient(
  { gql: gqlUrl, ws: wsUrl, gqlws: gqlwsUrl },
  fetchToken
) {
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

  const socketLink = new GraphQLWsLink(
    createClient({
      url: gqlwsUrl,
      lazy: true,
      connectionParams: () => {
        const token = fetchToken()
        return token ? { token: `Bearer ${token}` } : {}
      },
    })
  )
  const gqlLink = errorLink.concat(httpLink)

  const splitLink = split(
    (operation) => hasSubscription(operation.query),
    socketLink,
    authLink.concat(retryLink).concat(gqlLink)
  )

  const client = new ApolloClient({
    // @ts-ignore
    link: splitLink,
    cache: new InMemoryCache({
      possibleTypes: fragments.possibleTypes,
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

  setInterval(() => maybeReconnect(socket), 5000)

  return { client, socket }
}

const { client, socket } = buildClient(
  { gql: GQL_URL, ws: WS_URI, gqlws: GQL_WS_URI },
  fetchToken
)

export { client, socket }
