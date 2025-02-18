import ClusterLogs from 'components/cd/cluster/ClusterLogs'
import Clusters from 'components/cd/clusters/Clusters'
import ContinuousDeployment, {
  useDefaultCDPath,
} from 'components/cd/ContinuousDeployment'

import GlobalServices from 'components/cd/globalServices/GlobalService'

import Namespaces from 'components/cd/namespaces/Namespaces'

import Pipelines from 'components/cd/pipelines/Pipelines'
import Repositories from 'components/cd/repos/Repositories'

import ServiceComponent from 'components/cd/services/component/ServiceComponent'
import ServiceComponents from 'components/cd/services/service/ServiceComponents'

import ServiceDependencies from 'components/cd/services/service/ServiceDependencies'
import ServiceDetails from 'components/cd/services/service/ServiceDetails'
import ServiceDryRun from 'components/cd/services/service/ServiceDryRun'
import ServiceErrors from 'components/cd/services/service/ServiceErrors'
import ServiceHelm from 'components/cd/services/service/ServiceHelm'
import { ServiceInsights } from 'components/cd/services/service/ServiceInsights'

import ServiceLogs from 'components/cd/services/service/ServiceLogs'
import ServiceRevisions from 'components/cd/services/service/ServiceRevisions'
import ServiceSecrets from 'components/cd/services/service/ServiceSecrets'
import ServiceSettings from 'components/cd/services/service/ServiceSettings'
import Services from 'components/cd/services/Services'

import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import ComponentEvents from 'components/component/ComponentEvents'

import ComponentInfo from 'components/component/ComponentInfo'
import { ComponentInsights } from 'components/component/ComponentInsights'

import ComponentMetadata from 'components/component/ComponentMetadata'
import ComponentMetrics from 'components/component/ComponentMetrics'
import ComponentRaw from 'components/component/ComponentRaw'
import ComponentTree from 'components/component/ComponentTree'
import { Navigate, Outlet, Route } from 'react-router-dom'
import ClusterAddOnCompatibility from '../components/cd/cluster/addon/ClusterAddOnCompatibility'
import ClusterAddOnReadme from '../components/cd/cluster/addon/ClusterAddOnReadme'
import ClusterAddOnReleases from '../components/cd/cluster/addon/ClusterAddOnReleases'

import Cluster from '../components/cd/cluster/Cluster'
import ClusterAddOns from '../components/cd/cluster/ClusterAddOns'
import ClusterInsightComponent from '../components/cd/cluster/ClusterInsightComponent.tsx'
import ClusterInsights, {
  ClusterInsightsSummary,
} from '../components/cd/cluster/ClusterInsights.tsx'
import ClusterInsightsComponents from '../components/cd/cluster/ClusterInsightsComponents.tsx'
import ClusterMetadata from '../components/cd/cluster/ClusterMetadata'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

import ClusterPRs from '../components/cd/cluster/ClusterPRs'
import ClusterServices from '../components/cd/cluster/ClusterServices'

import Node from '../components/cd/cluster/node/Node'
import NodeEvents from '../components/cd/cluster/node/NodeEvents'
import NodeInfo from '../components/cd/cluster/node/NodeInfo'
import NodeMetadata from '../components/cd/cluster/node/NodeMetadata'
import NodeRaw from '../components/cd/cluster/node/NodeRaw'
import Logs from '../components/cd/cluster/pod/logs/Logs'

import Pod from '../components/cd/cluster/pod/Pod'
import PodInfo from '../components/cd/cluster/pod/PodInfo'
import PodShell from '../components/cd/cluster/pod/PodShell'

import VClusters from '../components/cd/cluster/VClusters'

import GlobalService from '../components/cd/globalServices/details/GlobalService'

import ManagedNamespace from '../components/cd/namespaces/details/ManagedNamespace'

import ManagedNamespaceInfo from '../components/cd/namespaces/details/ManagedNamespaceInfo'

import { ManagedNamespaceServices } from '../components/cd/namespaces/details/ManagedNamespaceServices'

import Observers from '../components/cd/observers/Observers'

import ServicePod from '../components/cd/services/service/pod/Pod'

import ServicePRs from '../components/cd/services/service/ServicePRs'

import ServicesTable from '../components/cd/services/ServicesTable'

import ServicesTree from '../components/cd/services/ServicesTree'

import ComponentDryRun from '../components/component/ComponentDryRun'

import { ClusterAlerts } from 'components/cd/cluster/ClusterAlerts.tsx'

import { ServiceAlerts } from 'components/cd/services/service/ServiceAlerts.tsx'
import { ServiceScalingRecs } from 'components/cd/services/service/ServiceScalingRecs.tsx'
import {
  AlertInsight,
  FullPageAlertInsight,
} from 'components/utils/alerts/AlertInsight.tsx'
import styled from 'styled-components'
import ClusterCloudAddOnCompatibility from '../components/cd/cluster/addon/ClusterCloudAddOnCompatibility.tsx'
import ClusterAddon from '../components/cd/cluster/ClusterAddon.tsx'
import ClusterCloudAddon from '../components/cd/cluster/ClusterCloudAddon.tsx'
import PodEvents from '../components/cd/cluster/pod/PodEvents.tsx'
import PodRaw from '../components/cd/cluster/pod/PodRaw.tsx'
import {
  ALERT_INSIGHT_REL_PATH,
  CD_REL_PATH,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_ALERTS_REL_PATH,
  CLUSTER_ALL_ADDONS_REL_PATH,
  CLUSTER_CLOUD_ADDONS_REL_PATH,
  CLUSTER_INSIGHTS_COMPONENTS_PATH,
  CLUSTER_INSIGHTS_PATH,
  CLUSTER_INSIGHTS_SUMMARY_PATH,
  CLUSTER_LOGS_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PODS_PATH,
  CLUSTER_PRS_REL_PATH,
  CLUSTER_REL_PATH,
  CLUSTER_SERVICES_PATH,
  CLUSTER_VCLUSTERS_REL_PATH,
  CLUSTERS_REL_PATH,
  COMPONENT_PARAM_ID,
  GLOBAL_SERVICE_PARAM_ID,
  GLOBAL_SERVICES_REL_PATH,
  NAMESPACE_INFO_PATH,
  NAMESPACE_SERVICES_PATH,
  NAMESPACES_PARAM_ID,
  NAMESPACES_REL_PATH,
  NODE_REL_PATH,
  OBSERVERS_REL_PATH,
  PIPELINES_REL_PATH,
  POD_REL_PATH,
  REPOS_REL_PATH,
  SERVICE_COMPONENT_PATH_MATCHER_REL,
  SERVICE_COMPONENTS_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_POD_REL_PATH,
  SERVICE_PRS_PATH,
  SERVICE_REL_PATH,
  SERVICES_REL_PATH,
  SERVICES_TREE_REL_PATH,
} from './cdRoutesConsts'
import { pipelineRoutes } from './pipelineRoutes'
function CDRootRedirect() {
  const defaultCDPath = useDefaultCDPath()

  return (
    <Navigate
      replace
      to={defaultCDPath}
    />
  )
}

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
      path="insights"
      element={<ComponentInsights />}
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
    <Route
      path="tree"
      element={<ComponentTree />}
    />
    <Route
      path="dryrun"
      element={<ComponentDryRun />}
    />
    <Route
      path="metadata"
      element={<ComponentMetadata />}
    />
  </Route>
)

export function RequireCdEnabled() {
  useCDEnabled({ redirect: true })

  return <Outlet />
}

function CDWrapper() {
  return (
    <MaxWidthWrapperSC>
      <RequireCdEnabled />
    </MaxWidthWrapperSC>
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
    >
      <Route
        index
        element={<ServicesTable />}
      />
      <Route
        path={SERVICES_TREE_REL_PATH}
        element={<ServicesTree />}
      />
    </Route>
    <Route
      path={PIPELINES_REL_PATH}
      element={<Pipelines />}
    />
    <Route
      path={OBSERVERS_REL_PATH}
      element={<Observers />}
    />
    <Route
      path="git"
      element={
        <Navigate
          replace
          to={`../${REPOS_REL_PATH}`}
        />
      }
    />
    <Route
      path={REPOS_REL_PATH}
      element={<Repositories />}
    />
    <Route
      path={NAMESPACES_REL_PATH}
      element={<Namespaces />}
    />
    <Route
      path={GLOBAL_SERVICES_REL_PATH}
      element={<GlobalServices />}
    />
  </Route>
)

const globalServiceRoutes = (
  <Route
    path={`${GLOBAL_SERVICES_REL_PATH}/:${GLOBAL_SERVICE_PARAM_ID}`}
    element={<GlobalService />}
  />
)

const namespacesRoutes = (
  <Route
    path={`${NAMESPACES_REL_PATH}/:${NAMESPACES_PARAM_ID}`}
    element={<ManagedNamespace />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={NAMESPACE_INFO_PATH}
        />
      }
    />
    <Route
      path={NAMESPACE_INFO_PATH}
      element={<ManagedNamespaceInfo />}
    />
    <Route
      path={NAMESPACE_SERVICES_PATH}
      element={<ManagedNamespaceServices />}
    />
  </Route>
)

const clusterDetailsRoutes = [
  <Route
    key="cluster-main"
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
    >
      <Route
        index
        element={<ServicesTable />}
      />
      <Route
        path={SERVICES_TREE_REL_PATH}
        element={<ServicesTree />}
      />
    </Route>
    <Route
      path={CLUSTER_NODES_PATH}
      element={<ClusterNodes />}
    />
    <Route
      path={CLUSTER_PODS_PATH}
      element={<ClusterPods />}
    />
    <Route
      path={CLUSTER_INSIGHTS_PATH}
      element={<ClusterInsights />}
    >
      <Route
        index
        path={CLUSTER_INSIGHTS_SUMMARY_PATH}
        element={<ClusterInsightsSummary />}
      />
      <Route
        path={CLUSTER_INSIGHTS_COMPONENTS_PATH}
        element={<ClusterInsightsComponents />}
      />
      <Route
        path={`${CLUSTER_INSIGHTS_COMPONENTS_PATH}/:${COMPONENT_PARAM_ID}`}
        element={<ClusterInsightComponent />}
      />
    </Route>
    <Route
      path={CLUSTER_ALERTS_REL_PATH}
      element={<ClusterAlerts />}
    />
    <Route
      path={CLUSTER_METADATA_PATH}
      element={<ClusterMetadata />}
    />
    <Route
      path={CLUSTER_VCLUSTERS_REL_PATH}
      element={<VClusters />}
    />
    <Route
      path={CLUSTER_PRS_REL_PATH}
      element={<ClusterPRs />}
    />
    <Route
      path={CLUSTER_LOGS_PATH}
      element={<ClusterLogs />}
    />
    <Route
      path={`${CLUSTER_ADDONS_REL_PATH}`}
      element={<ClusterAddOns />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={CLUSTER_ALL_ADDONS_REL_PATH}
          />
        }
      />
      <Route
        path={`${CLUSTER_ALL_ADDONS_REL_PATH}/:addOnId?`}
        element={<ClusterAddon />}
      >
        <Route
          index
          element={
            <Navigate
              replace
              to="compatibility"
            />
          }
        />
        <Route
          path="compatibility"
          element={<ClusterAddOnCompatibility />}
        />
        <Route
          path="readme"
          element={<ClusterAddOnReadme />}
        />
        <Route
          path="releases"
          element={<ClusterAddOnReleases />}
        />
      </Route>
      <Route
        path={`${CLUSTER_CLOUD_ADDONS_REL_PATH}/:addOnId?`}
        element={<ClusterCloudAddon />}
      >
        <Route
          index
          element={
            <Navigate
              replace
              to="compatibility"
            />
          }
        />
        <Route
          path="compatibility"
          element={<ClusterCloudAddOnCompatibility />}
        />
      </Route>
    </Route>
  </Route>,
  <Route
    key="cluster-alert-insight"
    path={`${CLUSTER_REL_PATH}/${CLUSTER_ALERTS_REL_PATH}/insight/:insightId`}
    element={<FullPageAlertInsight type="cluster" />}
  />,
]

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

const servicePodDetailsRoutes = (
  <Route
    path={SERVICE_POD_REL_PATH}
    element={<ServicePod />}
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
      element={<ServiceErrors />}
      path="errors"
    />
    <Route
      element={<ServicePRs />}
      path={SERVICE_PRS_PATH}
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
      element={<ServiceDependencies />}
      path="dependencies"
    />
    <Route
      element={<ServiceLogs />}
      path="logs"
    />
    <Route
      element={<ServiceDryRun />}
      path="dryrun"
    />
    <Route
      element={<ServiceAlerts />}
      path="alerts"
    />
    <Route
      path={ALERT_INSIGHT_REL_PATH}
      element={<AlertInsight type="service" />}
    />
    <Route
      element={<ServiceScalingRecs />}
      path="recommendations"
    />
    <Route
      element={<ServiceInsights />}
      path="insights"
    />
    <Route
      element={<ServiceSettings />}
      path="settings"
    />
    {/* <Route
      element={<ServiceDocs />}
      path="docs"
    >
      <Route
        path=":docName"
        element={<ServiceDocs />}
      />
    </Route> */}
  </Route>
)

export const cdRoutes = [
  <Route
    path={CD_REL_PATH}
    element={<CDWrapper />}
  >
    <Route
      index
      element={<CDRootRedirect />}
    />
    {mainRoutes}
    {clusterDetailsRoutes}
    {nodeDetailsRoutes}
    {podDetailsRoutes}
    {servicePodDetailsRoutes}
    {serviceDetailsRoutes}
    {componentRoutes}
    {pipelineRoutes}
    {globalServiceRoutes}
    {namespacesRoutes}
  </Route>,
]

const MaxWidthWrapperSC = styled.div({
  overflow: 'hidden',
  maxWidth: 1440,
  marginLeft: 'auto',
  marginRight: 'auto',
  height: '100%',
  width: '100%',
})
