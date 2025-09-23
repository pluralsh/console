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
import {
  getComponentRoutes,
  getPodDetailsRoutes,
  getServiceDetailsRoutes,
} from './cdRoutes.tsx'
import { FlowVulnerabilityReports } from 'components/flows/flow/FlowVulnerabilityReports.tsx'
import {
  VULNERABILITY_REPORT_PARAM_ID,
  VULNERABILITY_REPORTS_REL_PATH,
} from './securityRoutesConsts.tsx'
import { VulnerabilityReportDetails } from 'components/security/vulnerabilities/VulnReportDetails.tsx'

const FLOW_ABS_PREFIX = `${FLOWS_ABS_PATH}/:${FLOW_PARAM_ID}`

export const flowRoutes = [
  <Route
    path={FLOWS_ABS_PATH}
    element={<Flows />}
  />,
  <Route
    path={FLOW_ABS_PREFIX}
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
    <Route
      path={VULNERABILITY_REPORTS_REL_PATH}
      element={<FlowVulnerabilityReports />}
    />
  </Route>,
  <Route
    path={`${FLOW_ABS_PREFIX}/${ALERT_INSIGHT_REL_PATH}`}
    element={<FlowAlertInsight />}
  />,
  <Route
    path={`${FLOW_ABS_PREFIX}/${VULNERABILITY_REPORTS_REL_PATH}/:${VULNERABILITY_REPORT_PARAM_ID}`}
    element={<VulnerabilityReportDetails />}
  />,
  getServiceDetailsRoutes('flow'),
  getPodDetailsRoutes('flow'),
  getComponentRoutes('flow'),
]
