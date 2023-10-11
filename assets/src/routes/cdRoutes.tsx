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

export const CD_BASE_PATH = 'cd' as const
export const CLUSTERS_PATH = 'clusters' as const
export const SERVICES_PATH = 'services' as const

export const CLUSTER_BASE_PATH = `${CD_BASE_PATH}/${CLUSTERS_PATH}/:clusterId`
const CLUSTER_SERVICES_PATH = 'services' as const

export const SERVICE_PARAM_NAME = 'serviceName' as const
export const SERVICE_PARAM_CLUSTER = 'clusterName' as const
export const SERVICE_BASE_PATH = getServiceDetailsPath({
  isRelative: true,
  clusterName: `:${SERVICE_PARAM_CLUSTER}`,
  serviceName: `:${SERVICE_PARAM_NAME}`,
})

console.log('SERVICE_BASE_PATH', SERVICE_BASE_PATH)
export const SERVICE_COMPONENTS_PATH = 'components'

export const COMPONENT_PARAM_KIND = `componentKind` as const
export const COMPONENT_PARAM_NAME = `componentName` as const

export function getServiceDetailsPath({
  clusterName,
  serviceName,
  isRelative = false,
}: {
  clusterName: string | null | undefined
  serviceName: string | null | undefined
  isRelative?: boolean
}) {
  return `${
    isRelative ? '' : '/'
  }${CD_BASE_PATH}/${SERVICES_PATH}/${clusterName}/${serviceName}`
}

export function getServiceComponentPath({
  componentKind,
  componentName,
  ...props
}: Parameters<typeof getServiceDetailsPath>[0] & {
  componentKind: string | null | undefined
  componentName: string | null | undefined
}) {
  return `${getServiceDetailsPath({
    ...props,
  })}/${SERVICE_COMPONENTS_PATH}/${componentKind}/${componentName}`
}

export const componentRoutes = [
  <Route
    path={getServiceComponentPath({
      isRelative: true,
      clusterName: `:${SERVICE_PARAM_CLUSTER}`,
      serviceName: `:${SERVICE_PARAM_NAME}`,
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

  // Service component
  ...componentRoutes,
]
