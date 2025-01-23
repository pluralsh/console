import { Route } from 'react-router-dom'
import Edge from '../components/edge/Edge.tsx'

export const EDGE_ABS_PATH = '/edge'

export const edgeRoutes = [
  <Route
    path={EDGE_ABS_PATH}
    element={<Edge />}
  />,
]
