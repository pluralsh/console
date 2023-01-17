import { Navigate, Route } from 'react-router-dom'

import Builds from 'components/builds/Builds'
import Build from 'components/builds/build/Build'
import Changelog from 'components/builds/build/changelog/Changelog'
import Progress from 'components/builds/build/progress/Progress'
import AuditsTable from 'components/audits/table/AuditTable'
import AuditsGraph from 'components/audits/graph/AuditsGraph'

import MyProfile from 'components/profile/MyProfile'

import { Profile } from 'components/profile/Profile'

import { Security } from 'components/profile/Security'

import { Permissions } from 'components/profile/Permissions'

import Account from 'components/account/Account'

import { Groups } from 'components/account/groups/Groups'

import Audits from 'components/audits/Audits'

import { Roles } from 'components/account/Roles'

import { Webhooks } from 'components/account/webhooks/Webhooks'

import Users from 'components/account/users/Users'

import { clusterRoutes } from './clusterRoutes'
import { appsRoutes } from './appsRoutes'

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
      element={(
        <Navigate
          replace
          to="progress"
        />
      )}
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
      element={(
        <Navigate
          replace
          to="table"
        />
      )}
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
      element={(
        <Navigate
          replace
          to="me"
        />
      )}
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
  </Route>,
]

const accountRoutes = [
  <Route
    path="account"
    element={<Account />}
  >
    <Route
      index
      element={(
        <Navigate
          replace
          to="users"
        />
      )}
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
      path="webhooks"
      element={<Webhooks />}
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
]
