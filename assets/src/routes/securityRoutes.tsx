import { Navigate, Route } from 'react-router-dom'

import { Gatekeeper } from 'components/security/gatekeeper/Gatekeeper'
import Constraint from 'components/security/gatekeeper/constraint/Constraint'
import { Policies } from 'components/security/policies/Policies'
import { Security } from 'components/security/Security'
import { VulnerabilityReports } from 'components/security/vulnerabilities/VulnReports'
import { VulnerabilityReportDetails } from 'components/security/vulnerabilities/VulnReportDetails'

import {
  COMPLIANCE_REPORTS_ABS_PATH,
  GATEKEEPER_ABS_PATH,
  GATEKEEPER_AFFECTED_RESOURCES_PATH,
  GATEKEEPER_DETAILS_PATH,
  GATEKEEPER_PARAM_ID,
  GATEKEEPER_REL_PATH,
  POLICIES_REL_PATH,
  SECURITY_OVERVIEW_ABS_PATH,
  SECURITY_REL_PATH,
  VULNERABILITY_REPORT_PARAM_ID,
  VULNERABILITY_REPORTS_ABS_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from './securityRoutesConsts'
import ConstraintDetails from 'components/security/gatekeeper/constraint/details/ConstraintDetails'
import ConstraintAffectedResources from 'components/security/gatekeeper/constraint/affectedResources/ConstraintAffectedResources'
import { KUBERNETES_PARAM_CLUSTER } from './kubernetesRoutesConsts'
import Cluster from 'components/kubernetes/Cluster'
import { SecurityOverview } from 'components/security/overview/SecurityOverview'
import { ComplianceReports } from '../components/security/compliance/ComplianceReports.tsx'

export const securityRoutes = [
  <Route
    path={`${SECURITY_REL_PATH}`}
    element={<Security />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={SECURITY_OVERVIEW_ABS_PATH}
        />
      }
    />
    <Route
      path={SECURITY_OVERVIEW_ABS_PATH}
      element={<SecurityOverview />}
    />
    <Route
      path={COMPLIANCE_REPORTS_ABS_PATH}
      element={<ComplianceReports />}
    />
    <Route
      path={POLICIES_REL_PATH}
      element={<Policies />}
    />
    <Route
      path={GATEKEEPER_REL_PATH}
      element={<Gatekeeper />}
    />
    <Route
      path={VULNERABILITY_REPORTS_REL_PATH}
      element={
        <Cluster
          getDefaultClusterPath={(clusterId) =>
            `${VULNERABILITY_REPORTS_ABS_PATH}/${clusterId}`
          }
        />
      }
    >
      <Route
        path={KUBERNETES_PARAM_CLUSTER}
        element={<VulnerabilityReports />}
      />
    </Route>
  </Route>,
  <Route
    path={`${VULNERABILITY_REPORTS_ABS_PATH}/${KUBERNETES_PARAM_CLUSTER}/report/:${VULNERABILITY_REPORT_PARAM_ID}`}
    element={<VulnerabilityReportDetails />}
  />,
  <Route
    path={`${GATEKEEPER_ABS_PATH}/:${GATEKEEPER_PARAM_ID}`}
    element={<Constraint />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={`${GATEKEEPER_DETAILS_PATH}`}
        />
      }
    />
    <Route
      path={`${GATEKEEPER_DETAILS_PATH}`}
      element={<ConstraintDetails />}
    />
    <Route
      path={`${GATEKEEPER_AFFECTED_RESOURCES_PATH}`}
      element={<ConstraintAffectedResources />}
    />
  </Route>,
]
