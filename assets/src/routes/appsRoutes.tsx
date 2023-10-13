import { Navigate, Route } from 'react-router-dom'

import ComponentMetrics from 'components/component/ComponentMetrics'

import AppDocs from 'components/apps/app/docs/AppDocs'

import Credentials from 'components/apps/app/credentials/Credentials'

import Uninstall from 'components/apps/app/uninstall/Uninstall'

import AppComponents from 'components/apps/app/components/AppComponents'

import Apps from '../components/apps/Apps'
import App from '../components/apps/app/App'
import Dashboards from '../components/apps/app/dashboards/Dashboards'
import Runbooks from '../components/apps/app/runbooks/Runbooks'
import CostAnalysis from '../components/apps/app/cost/CostAnalysis'
import Dashboard from '../components/apps/app/dashboards/dashboard/Dashboard'
import Runbook from '../components/apps/app/runbooks/runbook/Runbook'
import Logs from '../components/apps/app/logs/Logs'
import UserManagement from '../components/apps/app/oidc/UserManagement'
import Configuration from '../components/apps/app/config/Configuration'
import AppComponent from '../components/apps/app/components/component/AppComponent'
import ComponentInfo from '../components/component/ComponentInfo'
import ComponentEvents from '../components/component/ComponentEvents'
import ComponentRaw from '../components/component/ComponentRaw'

export const appsRoutes = [
  <Route
    index
    element={<Apps />}
  />,
  <Route
    path="apps/:appName"
    element={<App />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="dashboards"
        />
      }
    />
    <Route
      path="dashboards"
      element={<Dashboards />}
    />
    <Route
      path="dashboards/:dashboardId"
      element={<Dashboard />}
    />
    <Route
      path="runbooks"
      element={<Runbooks />}
    />
    <Route
      path="credentials"
      element={<Credentials />}
    />
    <Route
      path="runbooks/:runbookName"
      element={<Runbook />}
    />
    <Route
      path="components"
      element={<AppComponents />}
    />
    <Route
      path="logs"
      element={<Logs />}
    />
    <Route
      path="cost"
      element={<CostAnalysis />}
    />
    <Route
      path="oidc"
      element={<UserManagement />}
    />
    <Route
      path="uninstall"
      element={<Uninstall />}
    />
    <Route
      path="config"
      element={<Configuration />}
    />
    <Route
      path="docs"
      element={<AppDocs />}
    >
      <Route
        path=":docName"
        element={<AppDocs />}
      />
    </Route>
  </Route>,

  /* COMPONENTS */
  <Route
    path="apps/:appName/components/:componentKind/:componentName"
    element={<AppComponent />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="info"
        />
      }
    />
    <Route
      path="info"
      element={<ComponentInfo />}
    />
    <Route
      path="metrics"
      element={<ComponentMetrics />}
    />
    <Route
      path="events"
      element={<ComponentEvents />}
    />
    <Route
      path="raw"
      element={<ComponentRaw />}
    />
  </Route>,
]
