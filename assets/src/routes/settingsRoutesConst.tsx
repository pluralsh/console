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

export const AUDITS_REL_PATH = 'audits' as const
export const AUDITS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${AUDITS_REL_PATH}` as const
