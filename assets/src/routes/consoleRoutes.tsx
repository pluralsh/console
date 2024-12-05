import Apps from 'components/apps/Apps'
import Build from 'components/builds/build/Build'
import Changelog from 'components/builds/build/changelog/Changelog'
import Progress from 'components/builds/build/progress/Progress'
import Builds from 'components/builds/Builds'
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
import { appsRoutes } from './appsRoutes'
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

const buildsRoutes = [
  <Route
    path="builds"
    element={<Builds />}
  />,
  <Route
    path="builds/:buildId"
    element={<Build />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="progress"
        />
      }
    />
    <Route
      path="progress"
      element={<Progress />}
    />
    <Route
      path="changelog"
      element={<Changelog />}
    />
  </Route>,
]

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

/*
const incidentsRoutes = [
  <Route
    path="incident/:incidentId"
    element={(
      <PluralApi>
        <Incident editing={undefined} />
      </PluralApi>
    )}
  />,
  <Route
    path="incidents"
    element={(
      <PluralApi>
        <Incidents />
      </PluralApi>
    )}
  />,
] */

export const consoleComponentRoutes = [
  ...catalogRoutes,
  ...appsRoutes,
  ...clusterRoutes,
  ...stacksRoutes,
  // ...incidentsRoutes,
  ...policiesRoutes,
  ...buildsRoutes,
  ...backupsRoutes,
  ...profileRoutes,
  ...cdRoutes,
  settingsRoutes,
  kubernetesRoutes,
  aiRoutes,
].map((route, idx) => ({ ...route, key: route.props.path ?? idx }))

export const consoleRoutes: RouteObject[] = [
  // ----- Old-style component-based routes -----
  {
    path: '*',
    element: <Routes>{consoleComponentRoutes}</Routes>,
  },

  // ----- New object-based routes -----
  // Index
  { index: true, element: <Apps /> },

  // HOME
  {
    path: HOME_REL_PATH,
    element: <Home />,
  },

  // SECRETS
  ...secretsRoutes,

  // PR QUEUE
  ...prRoutes,
]
