import { Suspense } from 'react'
import { Outlet, RouteObject } from 'react-router-dom'

import Console from 'components/layout/Console'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import Invite from 'components/login/Invite'
import { LinkLogin } from 'components/login/LinkLogin'
import Login, { GrantAccess } from 'components/login/Login'
import { OAuthCallback } from 'components/login/OauthCallback'

import Sandbox from 'components/utils/Sandbox'
import { consoleRoutes } from './consoleRoutes'

function Root() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Outlet />
    </Suspense>
  )
}

export const rootRoutes = [
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'quick-login/:key',
        element: <LinkLogin />,
      },
      {
        path: 'access',
        element: <GrantAccess />,
      },
      {
        path: 'oauth/callback',
        element: <OAuthCallback />,
      },
      {
        path: 'invite/:inviteId',
        element: <Invite />,
      },
      {
        path: 'sandbox',
        element: <Sandbox />,
      },
      {
        path: '*',
        element: <Console />,
        children: consoleRoutes,
      },
    ],
  },
] as const satisfies RouteObject[]
