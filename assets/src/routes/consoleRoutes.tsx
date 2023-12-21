import { Navigate, Route } from 'react-router-dom'

import { clusterRoutes } from './clusterRoutes'
import { appsRoutes } from './appsRoutes'
import { cdRoutes } from './cdRoutes'
import { lazyC } from './utils'

const buildsRoutes = [
  <Route
    path="builds"
    lazy={lazyC(import('components/builds/Builds'))}
  />,
  <Route
    lazy={lazyC(import('components/builds/build/Build'))}
    path="builds/:buildId"
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
      lazy={lazyC(import('components/builds/build/progress/Progress'))}
    />
    <Route
      path="changelog"
      lazy={lazyC(import('components/builds/build/changelog/Changelog'))}
    />
  </Route>,
]

const auditsRoutes = [
  <Route
    path="audits"
    lazy={lazyC(import('components/audits/Audits'))}
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
      lazy={lazyC(import('components/audits/table/AuditTable'))}
    />
    <Route
      path="graph"
      lazy={lazyC(import('components/audits/graph/AuditsGraph'))}
    />
  </Route>,
]

const profileRoutes = [
  <Route
    path="profile"
    lazy={lazyC(import('components/profile/MyProfile'))}
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
      lazy={lazyC(import('components/profile/Profile'))}
    />
    <Route
      path="security"
      lazy={lazyC(import('components/profile/Security'))}
    />
    <Route
      path="permissions"
      lazy={lazyC(import('components/profile/Permissions'))}
    />
    <Route
      path="vpn"
      lazy={lazyC(import('components/profile/VPN'))}
    />
    <Route
      path="access-tokens"
      lazy={lazyC(import('components/profile/AccessTokens'))}
    />
  </Route>,
]

const accountRoutes = [
  <Route
    path="account"
    lazy={lazyC(import('components/account/Account'))}
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
      lazy={lazyC(import('components/account/users/Users'))}
    />
    <Route
      path="groups"
      lazy={lazyC(import('components/account/groups/Groups'))}
    />
    <Route
      path="roles"
      lazy={lazyC(import('components/account/roles/Roles'))}
    />
    <Route
      path="webhooks"
      lazy={lazyC(import('components/account/webhooks/Webhooks'))}
    />
    <Route
      path="vpn"
      lazy={lazyC(import('components/account/vpn/VPN'))}
    />
    <Route
      path="email"
      lazy={lazyC(import('components/account/email/EmailSettings'))}
    />
    <Route
      path="settings"
      lazy={lazyC(import('components/account/settings/AccountSettings'))}
    />
    <Route
      path="cookies"
      lazy={lazyC(import('components/account/settings/CookieSettings'))}
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

export const consoleRoutes = [
  /* APPS */
  ...appsRoutes,

  /* CLUSTER */
  ...clusterRoutes,

  /* INCIDENTS */
  // ...incidentsRoutes,

  /* BUILDS */
  ...buildsRoutes,

  /* AUDITS */
  ...auditsRoutes,

  /* ACCOUNT */
  ...accountRoutes,

  /* PROFILE */
  ...profileRoutes,

  /* CONTINUOUS DEPLOYMENT */
  ...cdRoutes,
]
