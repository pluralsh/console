import { Breadcrumb } from '@pluralsh/design-system'

export const PR_REL_PATH = 'pr' as const
export const PR_ABS_PATH = `/${PR_REL_PATH}` as const

export const PR_QUEUE_REL_PATH = 'queue' as const
export const PR_QUEUE_ABS_PATH = `${PR_ABS_PATH}/${PR_QUEUE_REL_PATH}` as const

export const PR_DEPENDENCIES_REL_PATH = 'dependencies' as const
export const PR_DEPENDENCIES_ABS_PATH =
  `${PR_ABS_PATH}/${PR_DEPENDENCIES_REL_PATH}` as const

export const PR_DEFAULT_REL_PATH = PR_QUEUE_REL_PATH
export const PR_DEFAULT_ABS_PATH =
  `${PR_ABS_PATH}/${PR_DEFAULT_REL_PATH}` as const

export const PR_AUTOMATIONS_REL_PATH = 'automations' as const
export const PR_AUTOMATIONS_ABS_PATH =
  `${PR_ABS_PATH}/${PR_AUTOMATIONS_REL_PATH}` as const

export const PR_SCM_REL_PATH = 'scm' as const
export const PR_SCM_ABS_PATH = `${PR_ABS_PATH}/${PR_SCM_REL_PATH}` as const

export const PR_BASE_CRUMBS = [
  { label: 'PR queue', url: `${PR_ABS_PATH}/${PR_DEFAULT_REL_PATH}` },
] as const satisfies readonly Breadcrumb[]
