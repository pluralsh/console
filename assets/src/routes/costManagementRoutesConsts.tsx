export const COST_MANAGEMENT_REL_PATH = 'cost-management' as const
export const COST_MANAGEMENT_ABS_PATH = `/${COST_MANAGEMENT_REL_PATH}` as const
export const COST_MANAGEMENT_PARAM_ID = ':id' as const

export const CM_CHART_VIEW_REL_PATH = 'chart-view' as const
export const CM_TABLE_VIEW_REL_PATH = 'table-view' as const

export const CM_DETAILS_REL_PATH = 'details' as const

export const CM_OVERVIEW_REL_PATH = 'overview' as const
export const CM_NAMESPACES_REL_PATH = 'namespaces' as const
export const CM_RECOMMENDATIONS_REL_PATH = 'recommendations' as const

export const getCostManagementDetailsPath = (id: string) =>
  `${COST_MANAGEMENT_ABS_PATH}/${CM_DETAILS_REL_PATH}/${id}` as const
