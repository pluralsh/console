import { Route, redirect } from 'react-router-dom'

import NodeInfo from 'components/cluster/nodes/NodeInfo'
import Pods from 'components/cluster/pods/Pods'
import Pod from 'components/cluster/pods/Pod'
import PodInfo from 'components/cluster/pods/PodInfo'
import PodEvents from 'components/cluster/pods/PodEvents'
import PodRaw from 'components/cluster/pods/PodRaw'
import PodLogs from 'components/cluster/pods/PodLogs'
import Node from 'components/cluster/nodes/Node'
import Nodes from 'components/cluster/nodes/Nodes'
import NodeEvents from 'components/cluster/nodes/NodeEvents'
import NodeRaw from 'components/cluster/nodes/NodeRaw'
import NodeMetadata from 'components/cluster/nodes/NodeMetadata'
import Container from 'components/cluster/containers/Container'
import ContainerShell from 'components/cluster/containers/ContainerShell'
import ContainerMetadata from 'components/cluster/containers/ContainerMetadata'
import DatabaseManagement from 'components/db-management/DatabaseManagement'
import { DB_MANAGEMENT_PATH } from 'components/db-management/constants'

export const clusterRoutes = [
  /* Pods */
  <Route
    path="pods/:namespace?"
    index
    element={<Pods />}
  />,

  /* Pod Details */
  <Route
    path="pods/:namespace/:name"
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

  /* Nodes */
  <Route
    path="nodes"
    index
    element={<Nodes />}
  />,

  /* Node Details */
  <Route
    path="nodes/:name"
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

  /* Pod Shell */
  <Route
    path="pods/:namespace/:name/shell/:container"
    element={<Container />}
  >
    <Route
      index
      element={<ContainerShell />}
    />
    <Route
      path="metadata"
      element={<ContainerMetadata />}
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
    element={<DatabaseManagement />}
  />,
]
