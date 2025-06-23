export const SELF_SERVICE_ABS_PATH = '/self-service'

// Catalogs
export const CATALOGS_ABS_PATH = `${SELF_SERVICE_ABS_PATH}/catalogs`
export const CATALOGS_REL_PATH = 'catalogs'

export const CATALOG_PARAM_ID = 'id'
export const CATALOG_ABS_PATH = getCatalogAbsPath(`:${CATALOG_PARAM_ID}`)

export function getCatalogAbsPath(id: string | null | undefined) {
  return `${CATALOGS_ABS_PATH}/${id}`
}

// PRs
export const PR_REL_PATH = 'pr' as const
export const PR_ABS_PATH = `${SELF_SERVICE_ABS_PATH}/${PR_REL_PATH}` as const

export const PR_OUTSTANDING_REL_PATH = 'outstanding' as const
export const PR_OUTSTANDING_ABS_PATH =
  `${PR_ABS_PATH}/${PR_OUTSTANDING_REL_PATH}` as const

export const PR_AUTOMATIONS_REL_PATH = 'automations' as const
export const PR_AUTOMATIONS_ABS_PATH =
  `${PR_ABS_PATH}/${PR_AUTOMATIONS_REL_PATH}` as const

export const PR_SCM_REL_PATH = 'scm' as const
export const PR_SCM_ABS_PATH = `${PR_ABS_PATH}/${PR_SCM_REL_PATH}` as const

// TODO: DELETE
export const PR_SCM_WEBHOOKS_REL_PATH = 'scm-webhooks' as const
export const PR_SCM_WEBHOOKS_ABS_PATH =
  `${PR_ABS_PATH}/${PR_SCM_WEBHOOKS_REL_PATH}` as const
