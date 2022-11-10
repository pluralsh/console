import React, { useContext, useMemo } from 'react'
import { ApolloProvider } from 'react-apollo'

import { buildClient } from '../helpers/client'

import CurrentUser from './login/CurrentUser'
import { LoginContext } from './contexts'

const PLURAL_GQL = 'https://app.plural.sh/gql'
const PLURAL_WSS = 'wss://app.plural.sh/socket'

export const PluralApiContext = React.createContext({})
const API_CACHE = {}

export function withPluralApi(Component) {
  return function (props) {
    return (
      <PluralApi>
        <Component {...props} />
      </PluralApi>
    )
  }
}

export function PluralApi({ children }) {
  const { token } = useContext(LoginContext)
  const { client, socket } = useMemo(() => {
    if (API_CACHE[token]) return API_CACHE[token]
    const res = buildClient(
      PLURAL_GQL, PLURAL_WSS, () => {
        window.location = '/'
      }, () => token
    )

    API_CACHE[token] = res

    return res
  }, [token])

  return (
    <PluralApiContext.Provider value={{ socket }}>
      <ApolloProvider client={client}>
        <CurrentUser>
          {children}
        </CurrentUser>
      </ApolloProvider>
    </PluralApiContext.Provider>
  )
}
