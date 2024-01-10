import { createContext, useContext, useLayoutEffect, useMemo } from 'react'

import ContinuousDeployment, {
  POLL_INTERVAL,
} from 'components/cd/ContinuousDeployment'
import Clusters from 'components/cd/clusters/Clusters'
import Repositories from 'components/cd/repos/Repositories'
import Services from 'components/cd/services/Services'
import Providers from 'components/cd/providers/Providers'
import {
  Navigate,
  Outlet,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useCDEnabled } from 'components/cd/utils/useCDEnabled'

import ServiceComponent from 'components/cd/services/component/ServiceComponent'
import ServiceDetails from 'components/cd/services/service/ServiceDetails'
import ServiceDocs from 'components/cd/services/service/ServiceDocs'
import ServiceComponents from 'components/cd/services/service/ServiceComponents'
import ServiceSecrets from 'components/cd/services/service/ServiceSecrets'
import ServiceRevisions from 'components/cd/services/service/ServiceRevisions'
import ServiceSettings from 'components/cd/services/service/ServiceSettings'
import ServiceHelm from 'components/cd/services/service/ServiceHelm'

import ComponentInfo from 'components/component/ComponentInfo'
import ComponentEvents from 'components/component/ComponentEvents'
import ComponentRaw from 'components/component/ComponentRaw'
import ComponentMetrics from 'components/component/ComponentMetrics'

import { GlobalSettings } from 'components/cd/globalSettings/GlobalSettings'
import { GlobalSettingsPermissions } from 'components/cd/globalSettings/GlobalSettingsPermissions'
import { GlobalSettingsRepositories } from 'components/cd/globalSettings/GlobalSettingsRepositories'
import SelfManage from 'components/cd/globalSettings/SelfManage'

import Pipelines from 'components/cd/pipelines/Pipelines'

import GlobalSettingsObservability from 'components/cd/globalSettings/GlobalSettingsObservability'

import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import Cluster from '../components/cd/cluster/Cluster'
import ClusterServices from '../components/cd/cluster/ClusterServices'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

import Node from '../components/cd/cluster/node/Node'
import NodeInfo from '../components/cd/cluster/node/NodeInfo'
import NodeEvents from '../components/cd/cluster/node/NodeEvents'
import NodeRaw from '../components/cd/cluster/node/NodeRaw'
import NodeMetadata from '../components/cd/cluster/node/NodeMetadata'

import AddOns from '../components/cd/addOns/AddOns'
import Pod from '../components/cd/cluster/pod/Pod'
import PodInfo from '../components/cd/cluster/pod/PodInfo'
import ClusterMetadata from '../components/cd/cluster/ClusterMetadata'
import PodRaw from '../components/cluster/pods/PodRaw'
import PodEvents from '../components/cluster/pods/PodEvents'
import Logs from '../components/cd/cluster/pod/logs/Logs'
import PodShell from '../components/cd/cluster/pod/PodShell'

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

export const componentRoutes = (
  <Route
    path={SERVICE_COMPONENT_PATH_MATCHER_REL}
    element={<ServiceComponent />}
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
  <Route element={<ContinuousDeployment />}>
    <Route
      path={CLUSTERS_REL_PATH}
      element={<Clusters />}
    />
    <Route
      path={`${SERVICES_REL_PATH}/:${SERVICE_PARAM_CLUSTER_ID}?`}
      element={<Services />}
    />
    <Route
      path={PIPELINES_REL_PATH}
      element={<Pipelines />}
    >
      <Route
        path=":pipelineId"
        element={<Pipelines />}
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
      element={<Repositories />}
    />
    <Route
      path={PROVIDERS_REL_PATH}
      element={<Providers />}
    />
    <Route
      path={ADDONS_REL_PATH}
      element={<AddOns />}
    />
  </Route>
)

const globalSettingsRoutes = (
  <Route
    path={GLOBAL_SETTINGS_REL_PATH}
    element={<GlobalSettings />}
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
      element={<GlobalSettingsPermissions type="read" />}
    />
    <Route
      path="permissions/write"
      element={<GlobalSettingsPermissions type="write" />}
    />
    <Route
      path="permissions/create"
      element={<GlobalSettingsPermissions type="create" />}
    />
    <Route
      path="permissions/git"
      element={<GlobalSettingsPermissions type="git" />}
    />
    <Route
      path="repositories"
      element={<GlobalSettingsRepositories />}
    />
    <Route
      path="auto-update"
      element={<SelfManage />}
    />
    <Route
      path="observability"
      element={<GlobalSettingsObservability />}
    />
  </Route>
)

const clusterDetailsRoutes = (
  <Route
    path={CLUSTER_REL_PATH}
    element={<Cluster />}
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
      element={<ClusterServices />}
    />
    <Route
      path={CLUSTER_NODES_PATH}
      element={<ClusterNodes />}
    />
    <Route
      path={CLUSTER_PODS_PATH}
      element={<ClusterPods />}
    />
    <Route
      path={CLUSTER_METADATA_PATH}
      element={<ClusterMetadata />}
    />
  </Route>
)

const nodeDetailsRoutes = (
  <Route
    path={NODE_REL_PATH}
    element={<Node />}
  >
    <Route
      index
      element={<NodeInfo />}
    />
    <Route
      path="events"
      element={<NodeEvents />}
    />
    <Route
      path="raw"
      element={<NodeRaw />}
    />
    <Route
      path="metadata"
      element={<NodeMetadata />}
    />
  </Route>
)

const podDetailsRoutes = (
  <Route
    path={POD_REL_PATH}
    element={<Pod />}
  >
    <Route
      index
      element={<PodInfo />}
    />
    <Route
      path="events"
      element={<PodEvents />}
    />
    <Route
      path="raw"
      element={<PodRaw />}
    />
    <Route
      path="logs"
      element={<Logs />}
    />
    <Route
      path="shell"
      element={<PodShell />}
    />
  </Route>
)

const serviceDetailsRoutes = (
  <Route
    path={SERVICE_REL_PATH}
    element={<ServiceDetails />}
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
      element={<ServiceComponents />}
      path={SERVICE_COMPONENTS_PATH}
    />
    <Route
      element={<ServiceSecrets />}
      path="secrets"
    />
    <Route
      element={<ServiceRevisions />}
      path="revisions"
    />
    <Route
      element={<ServiceHelm />}
      path="helm"
    />
    <Route
      element={<ServiceSettings />}
      path="settings"
    />
    <Route
      element={<ServiceDocs />}
      path="docs"
    >
      <Route
        path=":docName"
        element={<ServiceDocs />}
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
