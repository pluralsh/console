import ClusterLogs from 'components/cd/cluster/ClusterLogs'
import Clusters from 'components/cd/clusters/Clusters'
import ContinuousDeployment, {
  useDefaultCDPath,
} from 'components/cd/ContinuousDeployment'

import GlobalServices from 'components/cd/globalServices/GlobalServices.tsx'

import Namespaces from 'components/cd/namespaces/Namespaces'

import Pipelines from 'components/cd/pipelines/Pipelines'
import Repositories from 'components/cd/repos/Repositories'

import { ServiceComponent } from 'components/cd/services/component/ServiceComponent'
import { ServiceComponents } from 'components/cd/services/service/ServiceComponents'

import { ServiceDependencies } from 'components/cd/services/service/ServiceDependencies'
import ServiceDetails from 'components/cd/services/service/ServiceDetails'
import ServiceDryRun from 'components/cd/services/service/ServiceDryRun'
import ServiceErrors from 'components/cd/services/service/ServiceErrors'
import { ServiceInsights } from 'components/cd/services/service/ServiceInsights'
import { ServiceStackImports } from 'components/cd/services/service/ServiceStackImports'

import ServiceLogs from 'components/cd/services/service/ServiceLogs'
import { ServiceRevisions } from 'components/cd/services/service/ServiceRevisions'
import { ServiceGitSettings } from 'components/cd/services/service/settings/ServiceGitSettings.tsx'
import { ServiceSecrets } from 'components/cd/services/service/settings/ServiceSecrets'
import Services from 'components/cd/services/Services'

import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import ComponentEvents from 'components/component/ComponentEvents'

import ComponentInfo from 'components/component/ComponentInfo'
import { ComponentInsights } from 'components/component/ComponentInsights'

import ComponentMetadata from 'components/component/ComponentMetadata'
import ComponentMetrics from 'components/component/ComponentMetrics'
import ComponentRaw from 'components/component/ComponentRaw'
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
import { ClusterInsightsComponents } from '../components/cd/cluster/ClusterInsightsComponents.tsx'
import { ClusterMetadata } from '../components/cd/cluster/ClusterMetadata'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

import ClusterPRs from '../components/cd/cluster/ClusterPRs'
import ClusterServices from '../components/cd/cluster/ClusterServices'

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

import ServicePRs from '../components/cd/services/service/ServicePRs'

import ServicesTable from '../components/cd/services/ServicesTable'

import ServicesTree from '../components/cd/services/ServicesTree'

import ComponentDryRun from '../components/component/ComponentDryRun'

import { ClusterAlerts } from 'components/cd/cluster/ClusterAlerts.tsx'

import { ClusterDetails } from 'components/cd/cluster/ClusterDetails'
import { ClusterMetrics } from 'components/cd/cluster/ClusterMetrics.tsx'
import { ClusterNetwork } from 'components/cd/cluster/ClusterNetwork'
import { ServiceAlerts } from 'components/cd/services/service/ServiceAlerts.tsx'
import { ServiceContexts } from 'components/cd/services/service/ServiceContexts.tsx'
import { ServiceMetrics } from 'components/cd/services/service/ServiceMetrics.tsx'
import { ServiceNetwork } from 'components/cd/services/service/ServiceNetwork.tsx'
import { ServiceScalingRecs } from 'components/cd/services/service/ServiceScalingRecs.tsx'
import { ServiceHelmSettings } from 'components/cd/services/service/settings/ServiceHelmSettings.tsx'
import { ServiceSettings } from 'components/cd/services/service/settings/ServiceSettings.tsx'
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
  CD_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  CD_SERVICE_REL_PATH,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_ALERTS_REL_PATH,
  CLUSTER_ALL_ADDONS_REL_PATH,
  CLUSTER_CLOUD_ADDONS_REL_PATH,
  CLUSTER_DETAILS_PATH,
  CLUSTER_INSIGHTS_COMPONENTS_PATH,
  CLUSTER_INSIGHTS_PATH,
  CLUSTER_INSIGHTS_SUMMARY_PATH,
  CLUSTER_LOGS_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_METRICS_PATH,
  CLUSTER_NETWORK_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PARAM_ID,
  CLUSTER_PRS_REL_PATH,
  CLUSTER_REL_PATH,
  CLUSTER_SERVICES_PATH,
  CLUSTER_VCLUSTERS_REL_PATH,
  CLUSTERS_REL_PATH,
  COMPONENT_PARAM_ID,
  FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  FLOW_SERVICE_PATH_MATCHER_ABS,
  getPodDetailsPath,
  GLOBAL_SERVICE_PARAM_ID,
  GLOBAL_SERVICES_REL_PATH,
  NAMESPACE_INFO_PATH,
  NAMESPACE_SERVICES_PATH,
  NAMESPACES_PARAM_ID,
  NAMESPACES_REL_PATH,
  OBSERVERS_REL_PATH,
  PIPELINES_REL_PATH,
  POD_PARAM_NAME,
  POD_PARAM_NAMESPACE,
  PODS_REL_PATH,
  REPOS_REL_PATH,
  SERVICE_COMPONENTS_PATH,
  SERVICE_PARAM_ID,
  SERVICE_PRS_PATH,
  SERVICE_SETTINGS_GIT_REL_PATH,
  SERVICE_SETTINGS_HELM_REL_PATH,
  SERVICE_SETTINGS_REVISIONS_REL_PATH,
  SERVICE_SETTINGS_SECRETS_REL_PATH,
  SERVICES_REL_PATH,
  SERVICES_TREE_REL_PATH,
  SERVICE_SETTINGS_DEPENDENCIES_REL_PATH,
  SERVICE_SETTINGS_STACK_IMPORTS_REL_PATH,
  SERVICE_SETTINGS_CONTEXTS_REL_PATH,
} from './cdRoutesConsts'
import { FLOW_PARAM_ID } from './flowRoutesConsts.tsx'
import { pipelineRoutes } from './pipelineRoutes'
import { AI_AGENT_RUNS_PARAM_RUN_ID } from './aiRoutesConsts.tsx'

function CDRootRedirect() {
  const defaultCDPath = useDefaultCDPath()

  return (
    <Navigate
      replace
      to={defaultCDPath}
    />
  )
}

export const getComponentRoutes = (type: 'service' | 'flow') => (
  <Route
    path={
      type === 'service'
        ? CD_SERVICE_COMPONENT_PATH_MATCHER_ABS
        : FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS
    }
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
      path={SERVICES_REL_PATH}
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
      path={CLUSTER_METRICS_PATH}
      element={<ClusterMetrics />}
    />
    <Route
      path={CLUSTER_DETAILS_PATH}
      element={<ClusterDetails />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={CLUSTER_METADATA_PATH}
          />
        }
      />
      <Route
        path={CLUSTER_METADATA_PATH}
        element={<ClusterMetadata />}
      />
      <Route
        path={CLUSTER_NODES_PATH}
        element={<ClusterNodes />}
      />
      <Route
        path={PODS_REL_PATH}
        element={<ClusterPods />}
      />
      <Route
        path={CLUSTER_PRS_REL_PATH}
        element={<ClusterPRs />}
      />
    </Route>
    <Route
      path={CLUSTER_NETWORK_PATH}
      element={<ClusterNetwork />}
    />
    <Route
      path={CLUSTER_INSIGHTS_PATH}
      element={<ClusterInsights />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={CLUSTER_INSIGHTS_SUMMARY_PATH}
          />
        }
      />
      <Route
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
      path={CLUSTER_VCLUSTERS_REL_PATH}
      element={<VClusters />}
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

export const getPodDetailsRoutes = (
  type: 'service' | 'cluster' | 'flow' | 'agent-run'
) => (
  <Route
    path={getPodDetailsPath({
      type,
      clusterId: `:${CLUSTER_PARAM_ID}`,
      serviceId: `:${SERVICE_PARAM_ID}`,
      flowId: `:${FLOW_PARAM_ID}`,
      agentRunId: `:${AI_AGENT_RUNS_PARAM_RUN_ID}`,
      name: `:${POD_PARAM_NAME}`,
      namespace: `:${POD_PARAM_NAMESPACE}`,
    })}
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

export const getServiceDetailsRoutes = (type: 'cd' | 'flow') => (
  <Route
    path={type === 'cd' ? CD_SERVICE_REL_PATH : FLOW_SERVICE_PATH_MATCHER_ABS}
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
      element={<ServiceMetrics />}
      path="metrics"
    />
    <Route
      element={<ServiceNetwork />}
      path="network"
    />
    <Route
      element={<ServiceInsights />}
      path="insights"
    />
    <Route
      element={<ServiceSettings />}
      path="settings"
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={SERVICE_SETTINGS_GIT_REL_PATH}
          />
        }
      />
      <Route
        element={<ServiceGitSettings />}
        path={SERVICE_SETTINGS_GIT_REL_PATH}
      />
      <Route
        element={<ServiceHelmSettings />}
        path={SERVICE_SETTINGS_HELM_REL_PATH}
      />
      <Route
        element={<ServiceSecrets />}
        path={SERVICE_SETTINGS_SECRETS_REL_PATH}
      />
      <Route
        element={<ServiceRevisions />}
        path={SERVICE_SETTINGS_REVISIONS_REL_PATH}
      />
      <Route
        element={<ServiceDependencies />}
        path={SERVICE_SETTINGS_DEPENDENCIES_REL_PATH}
      />
      <Route
        element={<ServiceStackImports />}
        path={SERVICE_SETTINGS_STACK_IMPORTS_REL_PATH}
      />
      <Route
        element={<ServiceContexts />}
        path={SERVICE_SETTINGS_CONTEXTS_REL_PATH}
      />
    </Route>
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
    {getPodDetailsRoutes('cluster')}
    {getPodDetailsRoutes('service')}
    {getServiceDetailsRoutes('cd')}
    {getComponentRoutes('service')}
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
