import { Navigate, Route } from 'react-router-dom'
import Clusters from '../components/edge/clusters/Clusters.tsx'
import Edge from '../components/edge/Edge.tsx'
import Images from '../components/edge/images/Images.tsx'

export const EDGE_REL_PATH = 'edge'
export const EDGE_ABS_PATH = `/${EDGE_REL_PATH}`

export const EDGE_BASE_CRUMBS = [{ label: 'edge', url: EDGE_ABS_PATH }]
export const EDGE_CLUSTERS_REL_PATH = 'clusters'
export const EDGE_IMAGES_REL_PATH = 'images'
export const EDGE_DEFAULT_REL_PATH = EDGE_CLUSTERS_REL_PATH

export const edgeRoutes = [
  <Route
    path={EDGE_REL_PATH}
    element={<Edge />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={EDGE_DEFAULT_REL_PATH}
        />
      }
    />
    <Route
      element={<Clusters />}
      path={EDGE_CLUSTERS_REL_PATH}
    />
    <Route
      element={<Images />}
      path={EDGE_IMAGES_REL_PATH}
    />
  </Route>,
]
