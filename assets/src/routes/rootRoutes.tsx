import { Suspense } from 'react'
import { Outlet, RouteObject } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import Console from 'components/layout/Console'

import { LinkLogin } from 'components/login/LinkLogin'
import Login, { GrantAccess } from 'components/login/Login'
import Invite from 'components/login/Invite'
import { OAuthCallback } from 'components/login/OauthCallback'

import { consoleRoutes } from './consoleRoutes'

function Root() {
  // usePosthog()

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
        path: '*',
        element: <Console />,
        children: consoleRoutes,
      },
    ],
  },
] as const satisfies RouteObject[]
