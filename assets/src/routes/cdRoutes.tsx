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

import Cluster from '../components/cd/cluster/Cluster'
import ClusterServices from '../components/cd/cluster/ClusterServices'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

import {
  CD_BASE_PATH,
  CLUSTERS_PATH,
  CLUSTER_BASE_PATH,
  CLUSTER_SERVICES_PATH,
  COMPONENT_PARAM_KIND,
  COMPONENT_PARAM_NAME,
  SERVICE_BASE_PATH,
  SERVICE_COMPONENTS_PATH,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from './cdRoutesConsts'

export const componentRoutes = [
  <Route
    path={getServiceComponentPath({
      isRelative: true,
      clusterName: `:${SERVICE_PARAM_CLUSTER}`,
      serviceId: `:${SERVICE_PARAM_ID}`,
      componentKind: `:${COMPONENT_PARAM_KIND}`,
      componentName: `:${COMPONENT_PARAM_NAME}`,
    })}
    element={<ServiceComponent />}
  />,
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
      path="nodes"
      element={<ClusterNodes />}
    />
    <Route
      path="pods"
      element={<ClusterPods />}
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
