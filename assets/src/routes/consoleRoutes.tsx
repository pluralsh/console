import Home from 'components/home/Home'
import { AccessTokens } from 'components/profile/AccessTokens'
import { EmailSettings } from 'components/profile/EmailSettings'
import MyProfile from 'components/profile/MyProfile'
import { Permissions } from 'components/profile/Permissions'
import { Profile } from 'components/profile/Profile'
import { Security } from 'components/profile/Security'
import { ProfileVPN } from 'components/profile/VPN'
import { Navigate, Route, RouteObject, Routes } from 'react-router-dom'

import { aiRoutes } from './aiRoutes.tsx'
import { backupsRoutes } from './backupRoutes'
import { cdRoutes } from './cdRoutes'
import { clusterRoutes } from './clusterRoutes'
import { HOME_REL_PATH } from './consoleRoutesConsts'
import { kubernetesRoutes } from './kubernetesRoute'
import { policiesRoutes } from './policiesRoutes'
import { prRoutes } from './prRoutes'
import { secretsRoutes } from './secretsRoute'
import { settingsRoutes } from './settingsRoutes'
import { stacksRoutes } from './stacksRoutes'
import { catalogRoutes } from './catalogRoutes.tsx'

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
      path="permissions"
      element={<Permissions />}
    />
    <Route
      path="vpn"
      element={<ProfileVPN />}
    />
    <Route
      path="access-tokens"
      element={<AccessTokens />}
    />
  </Route>,
]

export const consoleComponentRoutes = [
  ...catalogRoutes,
  ...clusterRoutes,
  ...stacksRoutes,
  ...policiesRoutes,
  ...backupsRoutes,
  ...profileRoutes,
  ...cdRoutes,
  settingsRoutes,
  kubernetesRoutes,
  aiRoutes,
].map((route, idx) => ({ ...route, key: route.props.path ?? idx }))

export const consoleRoutes: RouteObject[] = [
  {
    path: '*',
    element: <Routes>{consoleComponentRoutes}</Routes>,
  },
  {
    path: HOME_REL_PATH,
    element: <Home />,
  },
  ...secretsRoutes,
  ...prRoutes,
]
