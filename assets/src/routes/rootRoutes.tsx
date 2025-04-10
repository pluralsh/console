import { lazy, Suspense } from 'react'
import { Outlet, RouteObject } from 'react-router-dom'

import Console from 'components/layout/Console'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import Invite from 'components/login/Invite'
import { LinkLogin } from 'components/login/LinkLogin'
import Login from 'components/login/Login'
import { OAuthCallback } from 'components/login/OauthCallback'
import { consoleRoutes } from './consoleRoutes'
import { OAuthConsent } from '../components/login/OAuthConsent.tsx'

const Sandbox =
  import.meta.env.MODE === 'development'
    ? lazy(() => import('components/utils/Sandbox'))
    : null

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
        path: 'oauth/callback',
        element: <OAuthCallback />,
      },
      {
        path: 'oauth/consent',
        element: <OAuthConsent />,
      },
      {
        path: 'invite/:inviteId',
        element: <Invite />,
      },
      ...(!!Sandbox ? [{ path: 'sandbox', element: <Sandbox /> }] : []),
      {
        path: '*',
        element: <Console />,
        children: consoleRoutes,
      },
    ],
  },
] as const satisfies RouteObject[]
