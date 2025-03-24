import { Navigate, Route } from 'react-router-dom'
import { Flows } from '../components/flow/Flows.tsx'
import { Flow } from '../components/flow/Flow.tsx'
import { McpConnections } from 'components/flow/McpConnections.tsx'
import {
  FLOWS_ABS_PATH,
  FLOW_MCP_CONNECTIONS_REL_PATH,
  FLOW_PARAM_ID,
} from './flowRoutesConsts.tsx'

export const flowRoutes = [
  <Route
    path={FLOWS_ABS_PATH}
    element={<Flows />}
  />,
  <Route
    path={`${FLOWS_ABS_PATH}/${FLOW_PARAM_ID}`}
    element={<Flow />}
  >
    <Route
      index
      element={<Navigate to={'services'} />}
    />
    <Route
      path={'services'}
      element={<div>Services</div>}
    />
    <Route
      path={'pipelines'}
      element={<div>Pipelines</div>}
    />
    <Route
      path={'prs'}
      element={<div>PRs</div>}
    />
    <Route
      path={'alerts'}
      element={<div>Alerts</div>}
    />
    <Route
      path={FLOW_MCP_CONNECTIONS_REL_PATH}
      element={<McpConnections />}
    />
  </Route>,
]
