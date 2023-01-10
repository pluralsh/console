import { Navigate, Route } from 'react-router-dom'

import Users from 'components/Users'
import Webhooks from 'components/Webhooks'
import Builds from 'components/builds/Builds'
import Build from 'components/builds/build/Build'
import Directory from 'components/users/Directory'
import { Audits } from 'components/audits/Audits'
import { PluralApi } from 'components/PluralApi'
import { Incident } from 'components/incidents/Incident'
import Changelog from 'components/builds/build/changelog/Changelog'
import Progress from 'components/builds/build/progress/Progress'
import AuditsTable from 'components/audits/table/AuditTable'
import AuditsGraph from 'components/audits/graph/AuditsGraph'

import MyProfile from 'components/profile/MyProfile'

import { Profile } from 'components/profile/Profile'

import { Security } from 'components/profile/Security'

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
    {/* <Route
      path="roles"
      element={<Roles />}
    /> */}
  </Route>,
]

const directoryRoutes = [
  <Route
    path="directory/:section"
    element={<Directory />}
  />,
  <Route
    path="directory"
    element={(
      <Navigate
        replace
        to="/directory/users"
      />
    )}
  />,
]

const incidentsRoutes = [
  <Route
    path="incident/:incidentId"
    element={(
      <PluralApi>
        <Incident editing={undefined} />
      </PluralApi>
    )}
  />,
  // Disabled for now.
  /*
  <Route
    path="incidents"
    element={(
      <PluralApi>
        <Incidents />
      </PluralApi>
    )}
  />,
  */
]

export const consoleRoutes = [
  /* APPS */
  ...appsRoutes,

  /* CLUSTER */
  ...clusterRoutes,

  /* DIRECTORY */
  ...directoryRoutes,

  /* INCIDENTS */
  ...incidentsRoutes,

  /* BUILDS */
  ...buildsRoutes,

  /* AUDITS */
  ...auditsRoutes,

  /* PROFILE */
  ...profileRoutes,

  /* ETC */
  <Route
    path="webhooks"
    element={<Webhooks />}
  />,
  <Route
    path="users"
    element={<Users />}
  />,
]
