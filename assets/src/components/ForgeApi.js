import React, { useContext, useMemo } from 'react'
import { ApolloProvider } from 'react-apollo'
import { buildClient } from '../helpers/client'
import CurrentUser from './forge/CurrentUser'
import { LoginContext } from './Login'

const FORGE_GQL = 'https://forge.piazza.app/gql'
const FORGE_WSS = 'wss://forge.piazza.app/socket'

export function withForgeApi(Component) {
  return (props) => (
    <ForgeApi>
      <Component {...props} />
    </ForgeApi>
  )
}

export function ForgeApi({children}) {
  const {token} = useContext(LoginContext)
  const client = useMemo(() => buildClient(FORGE_GQL, FORGE_WSS, 
    () => { window.location = '/' },
    () => token
  ), [token])

  return (
    <ApolloProvider client={client}>
      <CurrentUser>
        {children}
      </CurrentUser>
    </ApolloProvider>
  )
}