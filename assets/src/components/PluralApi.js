import React, { useContext, useMemo } from 'react'
import { ApolloProvider } from 'react-apollo'
import { buildClient } from '../helpers/client'
import CurrentUser from './login/CurrentUser'
import { LoginContext } from './Login'

const PLURAL_GQL = 'https://app.plural.sh/gql'
const PLURAL_WSS = 'wss://app.plural.sh/socket'

export const PluralApiContext = React.createContext({})

export function withPluralApi(Component) {
  return (props) => (
    <PluralApi>
      <Component {...props} />
    </PluralApi>
  )
}

export function PluralApi({children}) {
  const {token} = useContext(LoginContext)
  const {client, socket} = useMemo(() => buildClient(PLURAL_GQL, PLURAL_WSS, 
    () => { window.location = '/' },
    () => token
  ), [token])

  return (
    <PluralApiContext.Provider value={{socket}}>
      <ApolloProvider client={client}>
        <CurrentUser>
          {children}
        </CurrentUser>
      </ApolloProvider>
    </PluralApiContext.Provider>
  )
}