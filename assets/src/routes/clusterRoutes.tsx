import { Route, redirect } from 'react-router-dom'

import Cluster from 'components/cluster/Cluster'
import NodeInfo from 'components/cluster/nodes/NodeInfo'
import Pods from 'components/cluster/pods/Pods'
import Pod from 'components/cluster/pods/Pod'
import PodInfo from 'components/cluster/pods/PodInfo'
import PodEvents from 'components/cluster/pods/PodEvents'
import PodRaw from 'components/cluster/pods/PodRaw'
import Node from 'components/cluster/nodes/Node'
import Nodes from 'components/cluster/nodes/Nodes'
import NodeEvents from 'components/cluster/nodes/NodeEvents'
import NodeRaw from 'components/cluster/nodes/NodeRaw'
import Container from 'components/cluster/containers/Container'
// import { PodShell } from 'components/terminal/PodShell'

export const clusterRoutes = [
  /* Pods */
  <Route
    path="pods"
    element={<Cluster />}
  >
    <Route
      index
      element={<Pods />}
      // loader={() => {}}
    />
  </Route>,

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
  </Route>,

  /* Nodes */
  <Route
    path="nodes"
    element={<Cluster />}
  >
    <Route
      index
      element={<Nodes />}
    />
  </Route>,

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
  </Route>,

  /* Pod Shell */
  <Route
    path="pods/:namespace/:name/shell/:container"
    element={<Container />}
  />,
  /* Redirect old routes */
  <Route
    path="shell/pod/:namespace/:name/:container"
    loader={async ({ params: { namespace, name, container } }) => {
      redirect(`/pods/${namespace}/${name}/shell/${container}`)
    }}
  />,
]
