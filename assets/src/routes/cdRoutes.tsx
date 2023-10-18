import ContinuousDeployment from 'components/cd/ContinuousDeployment'
import Clusters from 'components/cd/clusters/Clusters'
import GitRepositories from 'components/cd/repos/GitRepositories'
import Services from 'components/cd/services/Services'
import Providers from 'components/cd/providers/Providers'
import { Navigate, Route } from 'react-router-dom'

import ServiceDetails from 'components/cd/services/service/ServiceDetails'
import ServiceDocs from 'components/cd/services/service/ServiceDocs'
import ServiceComponents from 'components/cd/services/service/ServiceComponents'
import ServiceSecrets from 'components/cd/services/service/ServiceSecrets'
import ServiceComponent from 'components/cd/services/component/ServiceComponent'

import ComponentInfo from 'components/component/ComponentInfo'
import ComponentEvents from 'components/component/ComponentEvents'
import ComponentRaw from 'components/component/ComponentRaw'
import ComponentMetrics from 'components/component/ComponentMetrics'

import Cluster from '../components/cd/cluster/Cluster'
import ClusterServices from '../components/cd/cluster/ClusterServices'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

import Node from '../components/cd/cluster/node/Node'
import NodeInfo from '../components/cd/cluster/node/NodeInfo'
import NodeEvents from '../components/cd/cluster/node/NodeEvents'
import NodeRaw from '../components/cd/cluster/node/NodeRaw'
import NodeMetadata from '../components/cd/cluster/node/NodeMetadata'

import PodLogs from '../components/cd/cluster/pod/PodLogs'
import Pod from '../components/cd/cluster/pod/Pod'
import PodInfo from '../components/cd/cluster/pod/PodInfo'
import ClusterMetadata from '../components/cd/cluster/ClusterMetadata'
import PodRaw from '../components/cluster/pods/PodRaw'

import PodEvents from '../components/cluster/pods/PodEvents'

import {
  CD_BASE_PATH,
  CLUSTERS_PATH,
  CLUSTER_BASE_PATH,
  CLUSTER_METADATA_PATH,
  CLUSTER_NODES_PATH,
  CLUSTER_PODS_PATH,
  CLUSTER_SERVICES_PATH,
  NODE_BASE_PATH,
  POD_BASE_PATH,
  SERVICE_BASE_PATH,
  SERVICE_COMPONENTS_PATH,
  SERVICE_COMPONENT_PATH_MATCHER_REL,
  SERVICE_PARAM_CLUSTER,
} from './cdRoutesConsts'

export const componentRoutes = [
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
  </Route>,
]

export const cdRoutes = [
  /* Root */
  <Route
    path={CD_BASE_PATH}
    element={<ContinuousDeployment />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={CLUSTERS_PATH}
        />
      }
    />
    <Route
      path={CLUSTERS_PATH}
      element={<Clusters />}
    />
    <Route
      path={`services/:${SERVICE_PARAM_CLUSTER}?`}
      element={<Services />}
    />
    {/* <Route
      path="pipelines"
      element={<Pipelines />}
    /> */}
    <Route
      path="git"
      element={<GitRepositories />}
    />
    <Route
      path="providers"
      element={<Providers />}
    />
  </Route>,

  /* Cluster details */
  <Route
    path={CLUSTER_BASE_PATH}
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
  </Route>,

  /* Node Details */
  <Route
    path={NODE_BASE_PATH}
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
  </Route>,

  /* Pod Details */
  <Route
    path={POD_BASE_PATH}
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
      element={<PodLogs />}
    />
  </Route>,

  // Service details
  <Route
    path={SERVICE_BASE_PATH}
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
      element={<ServiceDocs />}
      path="docs"
    >
      <Route
        path=":docName"
        element={<ServiceDocs />}
      />
    </Route>
  </Route>,

  // Service component
  ...componentRoutes,
]
