import {
  ApolloClient,
  DocumentNode,
  InMemoryCache,
  split,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries'
import { RetryLink } from '@apollo/client/link/retry'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { hasSubscription } from '@jumpn/utils-graphql'
import { createLink } from 'apollo-absinthe-upload-link'
import { createClient } from 'graphql-ws'
import { Socket as PhoenixSocket } from 'phoenix'

import fragments from '../generated/fragments.json'
import { fetchToken } from './auth'

import { onErrorHandler } from './refreshToken'

import customFetch from './uploadLink'

const GQL_URL = '/gql'
const WS_URI = '/socket'
const GQL_WS_URI = '/socket/gql-ws'

export const { client, socket } = buildClient(
  { gql: GQL_URL, ws: WS_URI, gqlws: GQL_WS_URI },
  fetchToken
)

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

  const persistedQueryLink = createPersistedQueryLink(
    getPersistedQueryLinkOptions()
  )

  const gqlLink = errorLink.concat(persistedQueryLink).concat(httpLink)

  const splitLink = split(
    (operation) => hasSubscription(operation.query),
    socketLink,
    authLink.concat(retryLink).concat(gqlLink)
  )

  const client = new ApolloClient({
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
        // TODO: re-evaluate if this logic is actually being used correctly
        // Only configure specific merge behavior for the problematic connection
        ChatThread: {
          fields: {
            chats: {
              merge(existing, incoming, { args }) {
                // For paginated chats, merge properly based on cursor
                if (!existing) return incoming
                if (!incoming) return existing

                // If it's a fresh fetch (no cursor args), replace entirely
                if (!args?.after && !args?.before) {
                  return incoming
                }

                // Otherwise merge the connections
                return {
                  ...incoming,
                  edges: [...(existing.edges || []), ...(incoming.edges || [])],
                }
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

// partially adapted from https://github.com/apollographql/apollo-utils/blob/main/packages/persisted-query-lists/
function getPersistedQueryLinkOptions() {
  const operationIdsByNamePromise = Promise.resolve(
    import('../generated/persisted-queries/client.json')
  ).then(
    (manifest) =>
      new Map(
        Object.entries(manifest.operations).map(([id, { name }]) => [name, id])
      )
  )
  // errors here will still be caught and handled when we await the promise below, when we actually run an operation
  operationIdsByNamePromise.catch(() => {})

  async function generateHash(document: DocumentNode) {
    const operationIdsByName = await operationIdsByNamePromise

    let operationName: string | null = null
    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition') {
        if (!definition.name)
          throw new Error('Anonymous operations are not supported')
        if (operationName !== null)
          throw new Error('Multi-operation GraphQL documents are not supported')
        operationName = definition.name.value
      }
    }
    if (!operationName)
      throw new Error('Documents without operations are not supported')

    const operationId = operationIdsByName.get(operationName)
    // if we don't find the operation in the manifest, we want to log the error because it should be looked into
    // but it should still return a string for the hash so Apollo still triggers a retry with the full query string
    if (!operationId)
      console.error(`Operation ${operationName} not found in manifest`)
    return operationId || 'not-found'
  }

  return {
    generateHash,
    // keep sending query IDs even if the other side doesn't know them
    disable: () => false,
  }
}
