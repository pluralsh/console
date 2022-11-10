import { ApolloClient } from 'apollo-client'
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'
import { setContext } from 'apollo-link-context'
import { createLink } from 'apollo-absinthe-upload-link'
import { onError } from 'apollo-link-error'
import * as AbsintheSocket from '@absinthe/socket'
import { Socket as PhoenixSocket } from 'phoenix'
import { createAbsintheSocketLink } from 'pluralsh-absinthe-socket-apollo-link'
import { RetryLink } from 'apollo-link-retry'
// import { createPersistedQueryLink } from "@apollo/client/link/persisted-queries";
// import { sha256 } from 'crypto-hash';
import { hasSubscription } from '@jumpn/utils-graphql'
import { split } from 'apollo-link'

import introspection from '../generated/fragments.json'

import customFetch from './uploadLink'
import { fetchToken, wipeToken } from './auth'

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData: introspection,
})

const GQL_URL = '/gql'
const WS_URI = '/socket'

export function buildClient(
  gqlUrl, wsUrl, onNetworkError, fetchToken
) {
  const httpLink = createLink({ uri: gqlUrl, fetch: customFetch })

  const authLink = setContext((_, { headers }) => {
    const token = fetchToken()
    const authHeaders = token ? { authorization: `Bearer ${token}` } : {}

    return { headers: { ...headers, ...authHeaders } }
  })

  const resetToken = onError(({ networkError }) => {
    if (networkError && networkError.statusCode === 401) {
      console.log(networkError)
      onNetworkError()
    }
  })

  const retryLink = new RetryLink({
    delay: { initial: 200 },
    attempts: {
      max: Infinity,
      retryIf: error => !!error && !!fetchToken(),
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
  const gqlLink = resetToken.concat(httpLink)

  const splitLink = split(operation => hasSubscription(operation.query),
    socketLink,
    authLink.concat(retryLink).concat(gqlLink))

  const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({ fragmentMatcher }),
  })

  return { client, socket }
}

function onNetworkError() {
  wipeToken()
  window.location = '/login'
}

const { client, socket } = buildClient(
  GQL_URL, WS_URI, onNetworkError, fetchToken
)

export { client, socket }
