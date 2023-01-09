import { Route } from 'react-router-dom'

import { LinkLogin } from '../components/LinkLogin'
import Console from '../components/Console'

import Login, { GrantAccess } from '../components/Login'
import Invite from '../components/Invite'
import { OAuthCallback } from '../components/OauthCallback'

import { consoleRoutes } from './consoleRoutes'

export const rootRoutes = (
  <>
    <Route
      path="/login"
      element={<Login />}
    />
    <Route
      path="/quick-login/:key"
      element={<LinkLogin />}
    />
    <Route
      path="/access"
      element={<GrantAccess />}
    />
    <Route
      path="/oauth/callback"
      element={<OAuthCallback />}
    />
    <Route
      path="/invite/:inviteId"
      element={<Invite />}
    />
    <Route
      path="*"
      element={<Console />}
    >
      {consoleRoutes}
    </Route>
  </>
)
