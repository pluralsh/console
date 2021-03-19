import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { setContext } from 'apollo-link-context'
import { createLink } from "apollo-absinthe-upload-link"
import { onError } from 'apollo-link-error'
import * as AbsintheSocket from "@absinthe/socket"
import { Socket as PhoenixSocket } from "phoenix"
import { createAbsintheSocketLink } from "@absinthe/socket-apollo-link"
import { createPersistedQueryLink } from "apollo-link-persisted-queries"
import { hasSubscription } from "@jumpn/utils-graphql"
import { split } from 'apollo-link'
import { apiHost, secure } from './hostname'
import { HttpLink } from 'apollo-boost'
import customFetch from './uploadLink'
import { fetchToken, wipeToken } from './auth'

const API_HOST = apiHost()
const GQL_URL = `${secure() ? 'https' : 'http'}://${API_HOST}/gql`
const WS_URI  = `${secure() ? 'wss' : 'ws'}://${API_HOST}/socket`

export function buildClient(gqlUrl, wsUrl, onNetworkError, fetchToken) {
  const httpLink = createLink({uri: gqlUrl, fetch: customFetch})

  const authLink = setContext((_, { headers }) => {
    const token = fetchToken()
    let authHeaders = token ? {authorization: `Bearer ${token}`} : {}
    return {headers: {...headers, ...authHeaders}}
  })

  const resetToken = onError(({ networkError }) => {
    if (networkError && networkError.statusCode === 401) onNetworkError()
  });

  const socket = new PhoenixSocket(wsUrl, {
    params: () => {
      const token = fetchToken()
      return token ? { Authorization: `Bearer ${token}`} : {}
    }
  })

  const absintheSocket = AbsintheSocket.create(socket)

  const socketLink = createAbsintheSocketLink(absintheSocket)
  const gqlLink = createPersistedQueryLink().concat(resetToken).concat(httpLink)

  const splitLink = split(
    (operation) => hasSubscription(operation.query),
    socketLink,
    authLink.concat(gqlLink)
  )
  const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache()
  })
  
  return {client, socket}
}

function onNetworkError() {
  wipeToken()
  window.location = '/login'
}

const {client, socket} = buildClient(GQL_URL, WS_URI, onNetworkError, fetchToken)
export {client, socket}