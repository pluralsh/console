import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { Grommet } from 'grommet'

import { IntercomProvider } from 'react-use-intercom'

import { ApolloProvider } from 'react-apollo'

import { DEFAULT_THEME } from './theme'
import Console from './components/Console'
import Login, { GrantAccess } from './components/Login'
import Invite from './components/Invite'
import { OAuthCallback } from './components/OauthCallback'
import 'react-toggle/style.css'
import 'react-pulse-dot/dist/index.css'
import { client } from './helpers/client'
import { LinkLogin } from './components/LinkLogin'

const INTERCOM_APP_ID = 'p127zb9y'

export default function App() {
  return (
    <ApolloProvider client={client}>
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <Grommet theme={DEFAULT_THEME}>
          <BrowserRouter>
            <Switch>
              <Route
                path="/login"
                component={Login}
              />
              <Route
                path="/quick-login/:key"
                component={LinkLogin}
              />
              <Route
                path="/access"
                component={GrantAccess}
              />
              <Route
                path="/oauth/callback"
                component={OAuthCallback}
              />
              <Route
                path="/invite/:inviteId"
                component={Invite}
              />
              <Route
                path="/"
                component={Console}
              />
            </Switch>
          </BrowserRouter>
        </Grommet>
      </IntercomProvider>
    </ApolloProvider>
  )
}
