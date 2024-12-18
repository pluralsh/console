import { Navigate, Route } from 'react-router-dom'

import {
  COST_MANAGEMENT_ABS_PATH,
  CM_RECOMMENDATIONS_REL_PATH,
  CM_NAMESPACES_REL_PATH,
  COST_MANAGEMENT_PARAM_ID,
} from './costManagementRoutesConsts'
import { CostManagement } from 'components/cost-management/CostManagement'
import { CostManagementDetails } from 'components/cost-management/details/CostManagementDetails'
import { CostManagementDetailsRecommendations } from 'components/cost-management/details/CostManagementDetailsRecommendations'
import { CostManagementDetailsNamespaces } from 'components/cost-management/details/CostManagementDetailsNamespaces'

export const costManagementRoutes = [
  <Route
    path={`${COST_MANAGEMENT_ABS_PATH}`}
    element={<CostManagement />}
  />,
  <Route
    path={`${COST_MANAGEMENT_ABS_PATH}/details/${COST_MANAGEMENT_PARAM_ID}`}
    element={<CostManagementDetails />}
  >
    <Route
      index
      element={<Navigate to={CM_NAMESPACES_REL_PATH} />}
    />
    <Route
      path={CM_NAMESPACES_REL_PATH}
      element={<CostManagementDetailsNamespaces />}
    />
    <Route
      path={CM_RECOMMENDATIONS_REL_PATH}
      element={<CostManagementDetailsRecommendations />}
    />
  </Route>,
]
