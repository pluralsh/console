import { Route } from 'react-router-dom'

import { Policies } from 'components/policies/Policies'

import Policy from 'components/policies/policy/Policy'

import { POLICIES_REL_PATH, POLICY_PARAM_ID } from './policiesRoutesConsts'

export const policiesRoutes = [
  <Route
    path={`${POLICIES_REL_PATH}`}
    element={<Policies />}
  />,
  <Route
    path={`${POLICIES_REL_PATH}/:${POLICY_PARAM_ID}/*`}
    element={<Policy />}
  />,
]
