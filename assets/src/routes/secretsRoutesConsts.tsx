export const SECRETS_PATH = 'secrets' as const
export const SECRETS_HANDLE_PARAM = ':handle' as const
export const SECRETS_REL_PATH =
  `${SECRETS_PATH}/${SECRETS_HANDLE_PARAM}` as const
