import { Route, redirect } from 'react-router-dom'

import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'

import { lazyC } from './utils'

export const clusterRoutes = [
  /* Pods */
  <Route
    path="pods/:namespace?"
    index
    lazy={lazyC(import('components/cluster/pods/Pods'))}
  />,

  /* Pod Details */
  <Route
    path="pods/:namespace/:name"
    lazy={lazyC(import('components/cluster/pods/Pod'))}
  >
    <Route
      index
      lazy={lazyC(import('components/cluster/pods/PodInfo'))}
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
      lazy={lazyC(import('components/cluster/pods/PodLogs'))}
    />
  </Route>,

  /* Nodes */
  <Route
    path="nodes"
    index
    lazy={lazyC(import('components/cluster/nodes/Nodes'))}
  />,

  /* Node Details */
  <Route
    path="nodes/:name"
    lazy={lazyC(import('components/cluster/nodes/Node'))}
  >
    <Route
      index
      lazy={lazyC(import('components/cluster/nodes/NodeInfo'))}
    />
    <Route
      path="events"
      lazy={lazyC(import('components/cluster/nodes/NodeEvents'))}
    />
    <Route
      path="raw"
      lazy={lazyC(import('components/cluster/nodes/NodeRaw'))}
    />
    <Route
      path="metadata"
      lazy={lazyC(import('components/cluster/nodes/NodeMetadata'))}
    />
  </Route>,

  /* Pod Shell */
  <Route
    path="pods/:namespace/:name/shell/:container"
    lazy={lazyC(import('components/cluster/containers/Container'))}
  >
    <Route
      index
      lazy={lazyC(import('components/cluster/containers/ContainerShell'))}
    />
    <Route
      path="metadata"
      lazy={lazyC(import('components/cluster/containers/ContainerMetadata'))}
    />
  </Route>,
  /* Redirect old routes */
  <Route
    path="shell/pod/:namespace/:name/:container"
    loader={async ({ params: { namespace, name, container } }) => {
      redirect(`/pods/${namespace}/${name}/shell/${container}`)
    }}
  />,

  /* Database Management */
  <Route
    path={`${DB_MANAGEMENT_PATH}/:namespace?`}
    index
    lazy={lazyC(import('components/db-management/DatabaseManagement'))}
  />,
]
