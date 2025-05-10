import { Breadcrumb } from '@pluralsh/design-system'

export const SETTINGS_REL_PATH = 'settings' as const
export const SETTINGS_ABS_PATH = `/${SETTINGS_REL_PATH}` as const

export const USER_MANAGEMENT_REL_PATH = 'user-management' as const
export const USER_MANAGEMENT_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${USER_MANAGEMENT_REL_PATH}` as const

export const GLOBAL_SETTINGS_REL_PATH = 'global' as const
export const GLOBAL_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${GLOBAL_SETTINGS_REL_PATH}` as const

export const PROJECT_SETTINGS_REL_PATH = 'projects' as const
export const PROJECT_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${PROJECT_SETTINGS_REL_PATH}` as const

export const NOTIFICATIONS_REL_PATH = 'notifications' as const
export const NOTIFICATIONS_ABS_PATH =
  `/${SETTINGS_REL_PATH}/${NOTIFICATIONS_REL_PATH}` as const
export const NOTIFICATIONS_ROUTERS_REL_PATH = 'routers' as const
export const NOTIFICATIONS_ROUTERS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_ROUTERS_REL_PATH}` as const
export const NOTIFICATIONS_SINKS_REL_PATH = 'sinks' as const
export const NOTIFICATIONS_SINKS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_SINKS_REL_PATH}` as const

export const AUDITS_REL_PATH = 'audits' as const
export const AUDITS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${AUDITS_REL_PATH}` as const

export const ACCESS_TOKENS_REL_PATH = 'access-tokens' as const
export const ACCESS_TOKENS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${ACCESS_TOKENS_REL_PATH}` as const

export const NOTIFICATIONS_BASE_CRUMBS = [
  {
    label: 'settings',
    url: SETTINGS_ABS_PATH,
  },
  {
    label: 'notifications',
    url: NOTIFICATIONS_ABS_PATH,
  },
] as const satisfies readonly Breadcrumb[]
