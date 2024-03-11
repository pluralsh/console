import { Navigate, Route, RouteObject, Routes } from 'react-router-dom'

import Builds from 'components/builds/Builds'
import Build from 'components/builds/build/Build'
import Changelog from 'components/builds/build/changelog/Changelog'
import Progress from 'components/builds/build/progress/Progress'

import Audits from 'components/audits/Audits'
import AuditsTable from 'components/audits/table/AuditTable'
import AuditsGraph from 'components/audits/graph/AuditsGraph'

import MyProfile from 'components/profile/MyProfile'
import { Profile } from 'components/profile/Profile'
import { Security } from 'components/profile/Security'
import { Permissions } from 'components/profile/Permissions'
import { AccessTokens } from 'components/profile/AccessTokens'
import { ProfileVPN } from 'components/profile/VPN'

import Account from 'components/account/Account'
import { Groups } from 'components/account/groups/Groups'
import Roles from 'components/account/roles/Roles'
import { Webhooks } from 'components/account/webhooks/Webhooks'
import Users from 'components/account/users/Users'
import EmailSettings from 'components/account/email/EmailSettings'
import AccountSettings from 'components/account/settings/AccountSettings'
import CookieSettings from 'components/account/settings/CookieSettings'
import { AccountVPN } from 'components/account/vpn/VPN'

import Apps from 'components/apps/Apps'

import { Personas } from 'components/account/personas/Personas'

import { clusterRoutes } from './clusterRoutes'
import { appsRoutes } from './appsRoutes'
import { cdRoutes } from './cdRoutes'
import { prRoutes } from './prRoutes'
import { notificationsRoutes } from './notificationsRoutes'
import { backupsRoutes } from './backupRoutes'

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

const auditsRoutes = [
  <Route
    path="audits"
    element={<Audits />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="table"
        />
      }
    />
    <Route
      path="table"
      element={<AuditsTable />}
    />
    <Route
      path="graph"
      element={<AuditsGraph />}
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

const accountRoutes = [
  <Route
    path="account"
    element={<Account />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="users"
        />
      }
    />
    <Route
      path="users"
      element={<Users />}
    />
    <Route
      path="groups"
      element={<Groups />}
    />
    <Route
      path="roles"
      element={<Roles />}
    />
    <Route
      path="personas"
      element={<Personas />}
    />
    <Route
      path="webhooks"
      element={<Webhooks />}
    />
    <Route
      path="vpn"
      element={<AccountVPN />}
    />
    <Route
      path="email"
      element={<EmailSettings />}
    />
    <Route
      path="settings"
      element={<AccountSettings />}
    />
    <Route
      path="cookies"
      element={<CookieSettings />}
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
  /* APPS */
  ...appsRoutes,

  /* CLUSTER */
  ...clusterRoutes,

  /* INCIDENTS */
  // ...incidentsRoutes,

  /* BUILDS */
  ...buildsRoutes,

  /* BACKUPS */
  ...backupsRoutes,

  /* AUDITS */
  ...auditsRoutes,

  /* ACCOUNT */
  ...accountRoutes,

  /* PROFILE */
  ...profileRoutes,

  /* CONTINUOUS DEPLOYMENT */
  ...cdRoutes,
]

export const consoleRoutes: RouteObject[] = [
  // ----- Old-style component-based routes -----
  {
    path: '*',
    Component: () => <Routes>{consoleComponentRoutes}</Routes>,
  },

  // ----- New object-based routes -----
  // Index
  { index: true, Component: Apps },

  // PR QUEUE
  ...prRoutes,

  // NOTIFICATIONS
  ...notificationsRoutes,
]
