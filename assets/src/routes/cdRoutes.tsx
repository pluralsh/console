import { createContext, useContext, useLayoutEffect, useMemo } from 'react'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  Navigate,
  Outlet,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useCDEnabled } from 'components/cd/utils/useCDEnabled'

import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import {
  ADDONS_REL_PATH,
  CD_ABS_PATH,
  CD_DEFAULT_REL_PATH,
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PODS_PATH,
  CLUSTER_REL_PATH,
  CLUSTER_SERVICES_PATH,
  GLOBAL_SETTINGS_REL_PATH,
  NODE_REL_PATH,
  PIPELINES_REL_PATH,
  POD_REL_PATH,
  PROVIDERS_REL_PATH,
  REPOS_REL_PATH,
  SERVICES_REL_PATH,
  SERVICE_COMPONENTS_PATH,
  SERVICE_COMPONENT_PATH_MATCHER_REL,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_REL_PATH,
} from './cdRoutesConsts'
import { lazyC } from './utils'

export const componentRoutes = (
  <Route
    path={SERVICE_COMPONENT_PATH_MATCHER_REL}
    lazy={lazyC(import('components/cd/services/component/ServiceComponent'))}
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
  </Route>
)

const defaultLocation = `${CD_ABS_PATH}/${CD_DEFAULT_REL_PATH}` as const

const CDContext = createContext<{
  deploymentSettings?: DeploymentSettingsFragment | undefined | null
}>({})

export function useDeploymentSettings() {
  const ctx = useContext(CDContext)

  return ctx?.deploymentSettings
}

function CdRoot() {
  const { data } = useDeploymentSettingsQuery({
    pollInterval: POLL_INTERVAL,
  })
  const cdIsEnabled = useCDEnabled()
  const navigate = useNavigate()
  const location = useLocation()

  useLayoutEffect(() => {
    if (!cdIsEnabled && location.pathname !== defaultLocation) {
      navigate(defaultLocation)
    }
  }, [cdIsEnabled, location.pathname, navigate])
  const providerValue = useMemo(
    () => ({ deploymentSettings: data?.deploymentSettings }),
    [data?.deploymentSettings]
  )

  return (
    <CDContext.Provider value={providerValue}>
      <Outlet />
    </CDContext.Provider>
  )
}

const mainRoutes = (
  <Route lazy={lazyC(import('components/cd/ContinuousDeployment'))}>
    <Route
      path={CLUSTERS_REL_PATH}
      lazy={lazyC(import('components/cd/clusters/Clusters'))}
    />
    <Route
      path={`${SERVICES_REL_PATH}/:${SERVICE_PARAM_CLUSTER_ID}?`}
      lazy={lazyC(import('components/cd/services/Services'))}
    />
    <Route
      path={PIPELINES_REL_PATH}
      lazy={lazyC(import('components/cd/pipelines/Pipelines'))}
    >
      <Route
        path=":pipelineId"
        lazy={lazyC(import('components/cd/pipelines/Pipelines'))}
      />
    </Route>
    <Route
      path="git"
      element={
        <Navigate
          replace
          to={REPOS_REL_PATH}
        />
      }
    />
    <Route
      path={REPOS_REL_PATH}
      lazy={lazyC(import('components/cd/repos/Repositories'))}
    />
    <Route
      path={PROVIDERS_REL_PATH}
      lazy={lazyC(import('components/cd/providers/Providers'))}
    />
    <Route
      path={ADDONS_REL_PATH}
      lazy={lazyC(import('components/cd/addOns/AddOns'))}
    />
  </Route>
)

const globalSettingsRoutes = (
  <Route
    path={GLOBAL_SETTINGS_REL_PATH}
    lazy={lazyC(import('components/cd/globalSettings/GlobalSettings'))}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to="permissions/read"
        />
      }
    />
    <Route
      path="permissions/read"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsPermissions'),
        { type: 'read' }
      )}
    />
    <Route
      path="permissions/write"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsPermissions'),
        { type: 'write' }
      )}
    />
    <Route
      path="permissions/create"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsPermissions'),
        { type: 'create' }
      )}
    />
    <Route
      path="permissions/git"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsPermissions'),
        { type: 'git' }
      )}
    />
    <Route
      path="repositories"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsRepositories')
      )}
    />
    <Route
      path="auto-update"
      lazy={lazyC(import('components/cd/globalSettings/SelfManage'))}
    />
    <Route
      path="observability"
      lazy={lazyC(
        import('components/cd/globalSettings/GlobalSettingsObservability')
      )}
    />
  </Route>
)

const clusterDetailsRoutes = (
  <Route
    path={CLUSTER_REL_PATH}
    lazy={lazyC(import('components/cd/cluster/Cluster'))}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={CLUSTER_SERVICES_PATH}
        />
      }
    />
    <Route
      path={CLUSTER_SERVICES_PATH}
      lazy={lazyC(import('components/cd/cluster/ClusterServices'))}
    />
    <Route
      path={CLUSTER_NODES_PATH}
      lazy={lazyC(import('components/cd/cluster/ClusterNodes'))}
    />
    <Route
      path={CLUSTER_PODS_PATH}
      lazy={lazyC(import('components/cd/cluster/ClusterPods'))}
    />
    <Route
      path={CLUSTER_METADATA_PATH}
      lazy={lazyC(import('components/cd/cluster/ClusterMetadata'))}
    />
  </Route>
)

const nodeDetailsRoutes = (
  <Route
    path={NODE_REL_PATH}
    lazy={lazyC(import('components/cd/cluster/node/Node'))}
  >
    <Route
      index
      lazy={lazyC(import('components/cd/cluster/node/NodeInfo'))}
    />
    <Route
      path="events"
      lazy={lazyC(import('components/cd/cluster/node/NodeEvents'))}
    />
    <Route
      path="raw"
      lazy={lazyC(import('components/cd/cluster/node/NodeRaw'))}
    />
    <Route
      path="metadata"
      lazy={lazyC(import('components/cd/cluster/node/NodeMetadata'))}
    />
  </Route>
)

const podDetailsRoutes = (
  <Route
    path={POD_REL_PATH}
    lazy={lazyC(import('components/cd/cluster/pod/Pod'))}
  >
    <Route
      index
      lazy={lazyC(import('components/cd/cluster/pod/PodInfo'))}
    />
    <Route
      path="events"
      lazy={lazyC(import('components/cluster/pods/PodEvents'))}
    />
    <Route
      path="raw"
      lazy={lazyC(import('components/cluster/pods/PodRaw'))}
    />
    <Route
      path="logs"
      lazy={lazyC(import('components/cd/cluster/pod/logs/Logs'))}
    />
    <Route
      path="shell"
      lazy={lazyC(import('components/cd/cluster/pod/PodShell'))}
    />
  </Route>
)

const serviceDetailsRoutes = (
  <Route
    path={SERVICE_REL_PATH}
    lazy={lazyC(import('components/cd/services/service/ServiceDetails'))}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={SERVICE_COMPONENTS_PATH}
        />
      }
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceComponents'))}
      path={SERVICE_COMPONENTS_PATH}
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceSecrets'))}
      path="secrets"
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceRevisions'))}
      path="revisions"
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceHelm'))}
      path="helm"
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceSettings'))}
      path="settings"
    />
    <Route
      lazy={lazyC(import('components/cd/services/service/ServiceDocs'))}
      path="docs"
    >
      <Route
        lazy={lazyC(import('components/cd/services/service/ServiceDocs'))}
        path=":docName"
      />
    </Route>
  </Route>
)

export const cdRoutes = [
  <Route
    path={CD_REL_PATH}
    element={<CdRoot />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={CLUSTERS_REL_PATH}
        />
      }
    />
    {mainRoutes}
    {globalSettingsRoutes}
    {clusterDetailsRoutes}
    {nodeDetailsRoutes}
    {podDetailsRoutes}
    {serviceDetailsRoutes}
    {componentRoutes}
  </Route>,
]
