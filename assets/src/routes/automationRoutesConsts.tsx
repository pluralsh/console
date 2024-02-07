import { Breadcrumb } from '@pluralsh/design-system'

export const AUTOMATION_REL_PATH = 'automation' as const
export const AUTOMATION_ABS_PATH = `/${AUTOMATION_REL_PATH}` as const
export const AUTOMATION_PR_REL_PATH = 'pr' as const
export const AUTOMATION_PR_ABS_PATH =
  `${AUTOMATION_ABS_PATH}/${AUTOMATION_PR_REL_PATH}` as const
export const AUTOMATION_SCM_REL_PATH = 'scm' as const
export const AUTOMATION_SCM_ABS_PATH =
  `${AUTOMATION_ABS_PATH}/${AUTOMATION_SCM_REL_PATH}` as const
export const AUTOMATION_DEFAULT_REL_PATH = AUTOMATION_PR_REL_PATH
export const AUTOMATION_DEFAULT_ABS_PATH =
  `${AUTOMATION_ABS_PATH}/${AUTOMATION_DEFAULT_REL_PATH}` as const

export const AUTOMATION_BASE_CRUMBS = [
  {
    label: 'Autmation',
    url: AUTOMATION_DEFAULT_ABS_PATH,
  },
] as const satisfies readonly Breadcrumb[]
