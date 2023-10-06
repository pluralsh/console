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

import Cluster from '../components/cd/cluster/Cluster'
import ClusterServices from '../components/cd/cluster/ClusterServices'
import ClusterNodes from '../components/cd/cluster/ClusterNodes'
import ClusterPods from '../components/cd/cluster/ClusterPods'

export const CD_BASE_PATH = 'cd'
export const CLUSTERS_PATH = 'clusters'
export const SERVICES_PATH = 'services'

export const CLUSTER_BASE_PATH = `${CD_BASE_PATH}/${CLUSTERS_PATH}/:clusterId`
const CLUSTER_SERVICES_PATH = 'services'

export const SERVICE_PARAM_NAME = 'serviceId' as const
export const SERVICE_BASE_PATH = `${CD_BASE_PATH}/${SERVICES_PATH}/:${SERVICE_PARAM_NAME}`
const SERVICE_COMPONENTS_PATH = 'components'

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
      path="services"
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
]
