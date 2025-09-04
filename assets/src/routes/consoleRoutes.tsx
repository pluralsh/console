import { Home } from 'components/home/Home'
import { AccessTokens } from 'components/profile/AccessTokens'
import { EmailSettings } from 'components/profile/EmailSettings'
import MyProfile from 'components/profile/MyProfile'
import { Groups } from 'components/profile/Groups'
import { Profile } from 'components/profile/Profile'
import { Security } from 'components/profile/Security'
import { Navigate, Route, RouteObject, Routes } from 'react-router-dom'

import { GitHubSetup } from 'components/cloud-setup/GitHubSetup.tsx'
import { aiRoutes } from './aiRoutes.tsx'
import { cdRoutes } from './cdRoutes'
import { costManagementRoutes } from './costManagementRoutes.tsx'
import { edgeRoutes } from './edgeRoutes.tsx'
import { flowRoutes } from './flowRoutes.tsx'
import { kubernetesRoutes } from './kubernetesRoute'
import { secretsRoutes } from './secretsRoute'
import { securityRoutes } from './securityRoutes'
import { selfServiceRoutes } from './selfServiceRoutes'
import { settingsRoutes } from './settingsRoutes'
import { stacksRoutes } from './stacksRoutes'

const profileRoutes = [
  <Route
    path="profile"
    element={<MyProfile />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="me"
        />
      }
    />
    <Route
      path="me"
      element={<Profile />}
    />
    <Route
      path="email-settings"
      element={<EmailSettings />}
    />
    <Route
      path="security"
      element={<Security />}
    />
    <Route
      path="groups"
      element={<Groups />}
    />
    <Route
      path="access-tokens"
      element={<AccessTokens />}
    />
  </Route>,
]

export const consoleComponentRoutes = [
  ...edgeRoutes,
  ...stacksRoutes,
  // ...incidentsRoutes,
  ...securityRoutes,
  // ...backupsRoutes,
  ...costManagementRoutes,
  ...profileRoutes,
  ...cdRoutes,
  settingsRoutes,
  kubernetesRoutes,
  aiRoutes,
  ...flowRoutes,
  ...selfServiceRoutes,
].map((route, idx) => ({ ...route, key: route.props.path ?? idx }))

export const consoleRoutes: RouteObject[] = [
  {
    path: '*',
    element: <Routes>{consoleComponentRoutes}</Routes>,
  },
  {
    index: true,
    element: <Home />,
  },
  {
    path: 'home',
    element: <Home />,
  },
  {
    path: 'github/setup',
    element: <GitHubSetup />,
  },
  ...secretsRoutes,
]
