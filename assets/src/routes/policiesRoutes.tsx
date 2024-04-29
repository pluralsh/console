import { Route } from 'react-router-dom'

import Policies from 'components/policies/Policies'

import PolicyDetails from 'components/policies/details/PolicyDetails'

import PolicyAffectedResources from 'components/policies/affectedResources/PolicyAffectedResources'

import {
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
  POLICY_PARAM_ID,
} from './policiesRoutesConsts'

export const policiesRoutes = [
  <Route
    path={`${POLICIES_REL_PATH}`}
    element={<Policies />}
  />,
  <Route path={`${POLICIES_REL_PATH}/:${POLICY_PARAM_ID}`}>
    <Route
      path={`${POLICIES_DETAILS_PATH}`}
      element={<PolicyDetails />}
    />
    <Route
      path={`${POLICIES_AFFECTED_RESOURCES_PATH}`}
      element={<PolicyAffectedResources />}
    />
  </Route>,
]
