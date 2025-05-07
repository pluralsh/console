import {
  FlowAlertInsight,
  FlowAlerts,
} from 'components/flows/flow/FlowAlerts.tsx'
import { FlowMcpConnections } from 'components/flows/flow/FlowMcpConnections.tsx'
import { FlowPipelines } from 'components/flows/flow/FlowPipelines.tsx'
import { FlowPrs } from 'components/flows/flow/FlowPrs.tsx'
import { FlowServices } from 'components/flows/flow/FlowServices.tsx'
import { FlowPreviews } from 'components/flows/flow/previews/FlowPreviews.tsx'
import { Navigate, Route } from 'react-router-dom'
import { Flows } from '../components/flows/Flows.tsx'
import { Flow } from '../components/flows/flow/Flow.tsx'
import { ALERT_INSIGHT_REL_PATH } from './cdRoutesConsts.tsx'
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
      element={
        <Navigate
          replace
          to={'services'}
        />
      }
    />
    <Route
      path={'services'}
      element={<FlowServices />}
    />
    <Route
      path={'previews'}
      element={<FlowPreviews />}
    />
    <Route
      path={'pipelines'}
      element={<FlowPipelines />}
    />
    <Route
      path={'prs'}
      element={<FlowPrs />}
    />
    <Route
      path={'alerts'}
      element={<FlowAlerts />}
    />
    <Route
      path={FLOW_MCP_CONNECTIONS_REL_PATH}
      element={<FlowMcpConnections />}
    />
  </Route>,
  <Route
    path={`${FLOWS_ABS_PATH}/${FLOW_PARAM_ID}/${ALERT_INSIGHT_REL_PATH}`}
    element={<FlowAlertInsight />}
  />,
]
