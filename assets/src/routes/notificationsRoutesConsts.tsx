import { Breadcrumb } from '@pluralsh/design-system'

export const NOTIFICATIONS_REL_PATH = 'notifications' as const
export const NOTIFICATIONS_ABS_PATH = `/${NOTIFICATIONS_REL_PATH}` as const

export const NOTIFICATIONS_SINKS_REL_PATH = 'sinks' as const
export const NOTIFICATIONS_SINKS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_SINKS_REL_PATH}` as const

export const NOTIFICATIONS_ROUTERS_REL_PATH = 'routers' as const
export const NOTIFICATIONS_ROUTERS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_ROUTERS_REL_PATH}` as const

export const NOTIFICATIONS_DEFAULT_REL_PATH = NOTIFICATIONS_ROUTERS_REL_PATH
export const NOTIFICATIONS_DEFAULT_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_DEFAULT_REL_PATH}` as const

export const NOTIFICATIONS_BASE_CRUMBS = [
  {
    label: 'Notifications',
    url: `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_DEFAULT_REL_PATH}`,
  },
] as const satisfies readonly Breadcrumb[]
