import React from 'react'
import { Switch, Route } from 'react-router-dom'
import { Grommet } from 'grommet'
import { DEFAULT_THEME } from './theme';
import Console from './components/Console';
import Login, { GrantAccess } from './components/Login'
import Invite from './components/Invite';
import { OAuthCallback } from './components/OauthCallback';
import "react-toggle/style.css"
import 'react-pulse-dot/dist/index.css'
import { IntercomProvider } from 'react-use-intercom'

const INTERCOM_APP_ID = 'p127zb9y'

export default function App() {
  return (
    <IntercomProvider appId={INTERCOM_APP_ID}>
    <Grommet theme={DEFAULT_THEME}>
      <Switch>
        <Route path='/login' component={Login} />
        <Route path='/access' component={GrantAccess} />
        <Route path='/oauth/callback' component={OAuthCallback} />
        <Route path='/invite/:inviteId' component={Invite} />
        <Route path='/' component={Console} />
      </Switch>
    </Grommet>
    </IntercomProvider>
  );
}