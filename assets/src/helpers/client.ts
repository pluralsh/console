import { ApolloClient, InMemoryCache } from '@apollo/client'
import { setContext } from 'apollo-link-context'
import { createLink } from 'apollo-absinthe-upload-link'
import { onError } from 'apollo-link-error'
import * as AbsintheSocket from '@absinthe/socket'
import { Socket as PhoenixSocket } from 'phoenix'
import { createAbsintheSocketLink } from 'pluralsh-absinthe-socket-apollo-link'
import { RetryLink } from 'apollo-link-retry'
import { hasSubscription } from '@jumpn/utils-graphql'
import { split } from 'apollo-link'

import fragments from '../generated/fragments.json'

import { onErrorHandler } from './refreshToken'

import customFetch from './uploadLink'
import { fetchToken } from './auth'

const GQL_URL = '/gql'
const WS_URI = '/socket'

export const authlessClient = new ApolloClient({
  link: createLink({ uri: GQL_URL }),
  cache: new InMemoryCache(),
})

export function buildClient(gqlUrl, wsUrl, fetchToken) {
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

  socket.onClose((e) => {
    console.log('reconnecting closed socket', e)
    if (socket.closeWasClean) {
      socket.reconnectTimer.scheduleTimeout()
    }
  })

  setInterval(() => {
    if (socket.transport.readyState == WebSocket.CLOSED) {
      console.log('found dead websocket, attempting a reconnect')
      socket.reconnectTimer.scheduleTimeout()
    }
  }, 10000)

  window.addEventListener('pageshow', () => socket.connect())

  const absintheSocket = AbsintheSocket.create(socket)

  const socketLink = createAbsintheSocketLink(absintheSocket)
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

  return { client, socket }
}

const { client, socket } = buildClient(GQL_URL, WS_URI, fetchToken)

export { client, socket }
