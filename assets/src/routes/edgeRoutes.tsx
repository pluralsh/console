import { Route } from 'react-router-dom'
import Edge from '../components/edge/Edge.tsx'

export const EDGE_ABS_PATH = '/edge'

export const EDGE_BASE_CRUMBS = [{ label: 'edge', url: EDGE_ABS_PATH }]

export const edgeRoutes = [
  <Route
    path={EDGE_ABS_PATH}
    element={<Edge />}
  />,
]
