import { Breadcrumb } from '@pluralsh/design-system'

export const PR_REL_PATH = 'pr-queue' as const
export const PR_ABS_PATH = `/${PR_REL_PATH}` as const
export const PR_OUTSTANDING_REL_PATH = 'prs' as const
export const PR_OUTSTANDING_ABS_PATH =
  `${PR_ABS_PATH}/${PR_OUTSTANDING_REL_PATH}` as const
export const PR_DEPENDENCIES_REL_PATH = 'dependencies' as const
export const PR_DEPENDENCIES_ABS_PATH =
  `${PR_ABS_PATH}/${PR_DEPENDENCIES_REL_PATH}` as const
export const PR_DEFAULT_REL_PATH = PR_OUTSTANDING_REL_PATH
export const PR_DEFAULT_ABS_PATH =
  `${PR_ABS_PATH}/${PR_DEFAULT_REL_PATH}` as const

export const PR_BASE_CRUMBS = [
  { label: 'PR queue', url: `${PR_ABS_PATH}/${PR_DEFAULT_REL_PATH}` },
] as const satisfies readonly Breadcrumb[]
