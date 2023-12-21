import { Navigate, Route } from 'react-router-dom'

import Apps from 'components/apps/Apps'

import { lazyC } from './utils'

export const appsRoutes = [
  <Route
    index
    element={<Apps />}
  />,
  <Route
    path="apps/:appName"
    lazy={lazyC(import('components/apps/app/App'))}
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
      lazy={lazyC(import('components/apps/app/dashboards/Dashboards'))}
    />
    <Route
      path="dashboards/:dashboardId"
      lazy={lazyC(import('components/apps/app/dashboards/dashboard/Dashboard'))}
    />
    <Route
      path="runbooks"
      lazy={lazyC(import('components/apps/app/runbooks/Runbooks'))}
    />
    <Route
      path="credentials"
      lazy={lazyC(import('components/apps/app/credentials/Credentials'))}
    />
    <Route
      path="runbooks/:runbookName"
      lazy={lazyC(import('components/apps/app/runbooks/runbook/Runbook'))}
    />
    <Route
      path="components"
      lazy={lazyC(import('components/apps/app/components/AppComponents'))}
    />
    <Route
      path="logs"
      lazy={lazyC(import('components/apps/app/logs/Logs'))}
    />
    <Route
      path="cost"
      lazy={lazyC(import('components/apps/app/cost/CostAnalysis'))}
    />
    <Route
      path="oidc"
      lazy={lazyC(import('components/apps/app/oidc/UserManagement'))}
    />
    <Route
      path="uninstall"
      lazy={lazyC(import('components/apps/app/uninstall/Uninstall'))}
    />
    <Route
      path="config"
      lazy={lazyC(import('components/apps/app/config/Configuration'))}
    />
    <Route
      path="docs/:docName?"
      lazy={lazyC(import('components/apps/app/docs/AppDocs'))}
    />
  </Route>,

  /* COMPONENTS */
  <Route
    path="apps/:appName/components/:componentKind/:componentName"
    lazy={lazyC(
      import('components/apps/app/components/component/AppComponent')
    )}
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
      lazy={lazyC(import('components/component/ComponentInfo'))}
    />
    <Route
      path="metrics"
      lazy={lazyC(import('components/component/ComponentMetrics'))}
    />
    <Route
      path="events"
      lazy={lazyC(import('components/component/ComponentEvents'))}
    />
    <Route
      path="raw"
      lazy={lazyC(import('components/component/ComponentRaw'))}
    />
  </Route>,
]
