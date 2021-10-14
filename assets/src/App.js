import React from 'react'
import { Switch, Route } from 'react-router-dom'
import { Grommet } from 'grommet'
import { DEFAULT_THEME } from './theme';
import Console from './components/Console';
import Login from './components/Login'
import Invite from './components/Invite';
import { OAuthCallback } from './components/OauthCallback';
import "react-toggle/style.css"

export default function App() {
  return (
    <Grommet theme={DEFAULT_THEME}>
      <Switch>
        <Route path='/login' component={Login} />
        <Route path='/oauth/callback' component={OAuthCallback} />
        <Route path='/invite/:inviteId' component={Invite} />
        <Route path='/' component={Console} />
      </Switch>
    </Grommet>
  );
}