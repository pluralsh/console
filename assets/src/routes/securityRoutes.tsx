import { Navigate, Route } from 'react-router-dom'

import { Policies } from 'components/security/policies/Policies'
import Policy from 'components/security/policies/policy/Policy'
import { Security } from 'components/security/Security'
import { VulnerabilityReports } from 'components/security/vulnerabilities/VulnReports'
import { VulnerabilityReportDetails } from 'components/security/vulnerabilities/VulnReportDetails'

import {
  POLICIES_ABS_PATH,
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
  POLICY_PARAM_ID,
  SECURITY_REL_PATH,
  VULNERABILITY_REPORT_PARAM_ID,
  VULNERABILITY_REPORTS_ABS_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from './securityRoutesConsts'
import PolicyDetails from 'components/security/policies/policy/details/PolicyDetails'
import PolicyAffectedResources from 'components/security/policies/policy/affectedResources/PolicyAffectedResources'
import { KUBERNETES_PARAM_CLUSTER } from './kubernetesRoutesConsts'
import Cluster from 'components/kubernetes/Cluster'

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
          to={POLICIES_ABS_PATH}
        />
      }
    />
    <Route
      path={POLICIES_REL_PATH}
      element={<Policies />}
    />
    <Route
      path={`${POLICIES_REL_PATH}/:${POLICY_PARAM_ID}`}
      element={<Policy />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to={`${POLICIES_DETAILS_PATH}`}
          />
        }
      />
      <Route
        path={`${POLICIES_DETAILS_PATH}`}
        element={<PolicyDetails />}
      />
      <Route
        path={`${POLICIES_AFFECTED_RESOURCES_PATH}`}
        element={<PolicyAffectedResources />}
      />
    </Route>
    <Route
      path={`${VULNERABILITY_REPORTS_REL_PATH}/${KUBERNETES_PARAM_CLUSTER}`}
      element={<Cluster />}
    >
      <Route
        index
        element={<VulnerabilityReports />}
      />
    </Route>
  </Route>,
  <Route
    path={`${VULNERABILITY_REPORTS_ABS_PATH}/${KUBERNETES_PARAM_CLUSTER}/report/:${VULNERABILITY_REPORT_PARAM_ID}`}
    element={<VulnerabilityReportDetails />}
  />,
]
