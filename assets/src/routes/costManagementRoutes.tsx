import { Navigate, Route } from 'react-router-dom'

import {
  COST_MANAGEMENT_ABS_PATH,
  COST_MANAGEMENT_DETAILS_RECOMMENDATIONS_REL_PATH,
  COST_MANAGEMENT_DETAILS_NAMESPACES_REL_PATH,
} from './costManagementRoutesConsts'
import { CostManagement } from 'components/cost-management/CostManagement'
import { KUBERNETES_PARAM_CLUSTER } from './kubernetesRoutesConsts'
import { CostManagementDetails } from 'components/cost-management/details/CostManagementDetails'
import { CostManagementDetailsRecommendations } from 'components/cost-management/details/CostManagementDetailsRecommendations'
import { CostManagementDetailsNamespaces } from 'components/cost-management/details/CostManagementDetailsNamespaces'

export const costManagementRoutes = [
  <Route
    path={`${COST_MANAGEMENT_ABS_PATH}`}
    element={<CostManagement />}
  />,
  <Route
    path={`${COST_MANAGEMENT_ABS_PATH}/${KUBERNETES_PARAM_CLUSTER}`}
    element={<CostManagementDetails />}
  >
    <Route
      index
      element={<Navigate to={COST_MANAGEMENT_DETAILS_NAMESPACES_REL_PATH} />}
    />
    <Route
      path={COST_MANAGEMENT_DETAILS_NAMESPACES_REL_PATH}
      element={<CostManagementDetailsNamespaces />}
    />
    <Route
      path={COST_MANAGEMENT_DETAILS_RECOMMENDATIONS_REL_PATH}
      element={<CostManagementDetailsRecommendations />}
    />
  </Route>,
]
