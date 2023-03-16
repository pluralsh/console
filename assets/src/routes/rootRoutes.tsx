import { Outlet, Route } from 'react-router-dom'

import { usePosthog } from 'components/utils/Posthog'

import { LinkLogin } from '../components/login/LinkLogin'
import Console from '../components/layout/Console'

import Login, { GrantAccess } from '../components/login/Login'
import Invite from '../components/login/Invite'
import { OAuthCallback } from '../components/login/OauthCallback'

import { consoleRoutes } from './consoleRoutes'

function Root() {
  usePosthog()

  return <Outlet />
}

export const rootRoutes = (
  <Route
    path="/"
    element={<Root />}
  >
    <Route
      path="login"
      element={<Login />}
    />
    <Route
      path="quick-login/:key"
      element={<LinkLogin />}
    />
    <Route
      path="access"
      element={<GrantAccess />}
    />
    <Route
      path="oauth/callback"
      element={<OAuthCallback />}
    />
    <Route
      path="invite/:inviteId"
      element={<Invite />}
    />
    <Route
      path="*"
      element={<Console />}
    >
      {consoleRoutes}
    </Route>
  </Route>
)
