import { Breadcrumb } from '@pluralsh/design-system'

export const SETTINGS_REL_PATH = 'settings' as const
export const SETTINGS_ABS_PATH = `/${SETTINGS_REL_PATH}` as const
// user management
export const USER_MANAGEMENT_REL_PATH = 'user-management' as const
export const USER_MANAGEMENT_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${USER_MANAGEMENT_REL_PATH}` as const

// global
export const GLOBAL_SETTINGS_REL_PATH = 'global' as const
export const GLOBAL_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${GLOBAL_SETTINGS_REL_PATH}` as const

// ai
export const AI_SETTINGS_REL_PATH = 'ai' as const
export const AI_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${AI_SETTINGS_REL_PATH}` as const
export const AI_SETTINGS_AI_PROVIDER_REL_PATH = 'ai-provider' as const
export const AI_SETTINGS_AI_PROVIDER_ABS_PATH =
  `${AI_SETTINGS_ABS_PATH}/${AI_SETTINGS_AI_PROVIDER_REL_PATH}` as const
export const AI_SETTINGS_MODEL_ROUTING_REL_PATH = 'model-routing' as const
export const AI_SETTINGS_MODEL_ROUTING_ABS_PATH =
  `${AI_SETTINGS_ABS_PATH}/${AI_SETTINGS_MODEL_ROUTING_REL_PATH}` as const
export const AI_SETTINGS_AI_INSIGHTS_REL_PATH = 'ai-insights' as const
export const AI_SETTINGS_AI_INSIGHTS_ABS_PATH =
  `${AI_SETTINGS_ABS_PATH}/${AI_SETTINGS_AI_INSIGHTS_REL_PATH}` as const
export const AI_SETTINGS_AGENT_RUNTIMES_REL_PATH = 'agent-runtimes' as const
export const AI_SETTINGS_AGENT_RUNTIMES_ABS_PATH =
  `${AI_SETTINGS_ABS_PATH}/${AI_SETTINGS_AGENT_RUNTIMES_REL_PATH}` as const
export const AI_SETTINGS_MCP_SERVERS_REL_PATH = 'mcp-servers' as const
export const AI_SETTINGS_MCP_SERVERS_ABS_PATH =
  `${AI_SETTINGS_ABS_PATH}/${AI_SETTINGS_MCP_SERVERS_REL_PATH}` as const

// webhooks
export const WEBHOOKS_SETTINGS_REL_PATH = 'webhooks' as const
export const WEBHOOKS_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${WEBHOOKS_SETTINGS_REL_PATH}` as const
export const WEBHOOKS_SETTINGS_CREATE_REL_PATH = 'create' as const
export const WEBHOOKS_SETTINGS_CREATE_ABS_PATH =
  `${WEBHOOKS_SETTINGS_ABS_PATH}/${WEBHOOKS_SETTINGS_CREATE_REL_PATH}` as const
export const WEBHOOKS_SETTINGS_WEBHOOK_ID_PARAM_ID = 'webhookId' as const
export const WEBHOOKS_SETTINGS_EDIT_REL_PATH =
  `:${WEBHOOKS_SETTINGS_WEBHOOK_ID_PARAM_ID}/edit` as const
export const WEBHOOKS_SETTINGS_EDIT_PATH_MATCHER_ABS =
  `${WEBHOOKS_SETTINGS_ABS_PATH}/${WEBHOOKS_SETTINGS_EDIT_REL_PATH}` as const
export const getWebhooksSettingsEditAbsPath = ({
  webhookId,
}: {
  webhookId: Nullable<string>
}) => `${WEBHOOKS_SETTINGS_ABS_PATH}/${webhookId ?? ''}/edit`

// chatbots
export const CHATBOTS_SETTINGS_REL_PATH = 'chatbots' as const
export const CHATBOTS_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${CHATBOTS_SETTINGS_REL_PATH}` as const
export const CHATBOTS_SETTINGS_CREATE_REL_PATH = 'create' as const
export const CHATBOTS_SETTINGS_CREATE_ABS_PATH =
  `${CHATBOTS_SETTINGS_ABS_PATH}/${CHATBOTS_SETTINGS_CREATE_REL_PATH}` as const
export const CHATBOTS_SETTINGS_CHATBOT_ID_PARAM_ID = 'chatbotId' as const
export const CHATBOTS_SETTINGS_EDIT_REL_PATH =
  `:${CHATBOTS_SETTINGS_CHATBOT_ID_PARAM_ID}/edit` as const
export const CHATBOTS_SETTINGS_EDIT_PATH_MATCHER_ABS =
  `${CHATBOTS_SETTINGS_ABS_PATH}/${CHATBOTS_SETTINGS_EDIT_REL_PATH}` as const
export const getChatbotsSettingsEditAbsPath = ({
  chatbotId,
}: {
  chatbotId: Nullable<string>
}) => `${CHATBOTS_SETTINGS_ABS_PATH}/${chatbotId ?? ''}/edit`

// project
export const PROJECT_SETTINGS_REL_PATH = 'projects' as const
export const PROJECT_SETTINGS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${PROJECT_SETTINGS_REL_PATH}` as const

// audit
export const AUDITS_REL_PATH = 'audits' as const
export const AUDITS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${AUDITS_REL_PATH}` as const

// access token
export const ACCESS_TOKENS_REL_PATH = 'access-tokens' as const
export const ACCESS_TOKENS_ABS_PATH =
  `${SETTINGS_ABS_PATH}/${ACCESS_TOKENS_REL_PATH}` as const

// notifications
export const NOTIFICATIONS_REL_PATH = 'notifications' as const
export const NOTIFICATIONS_ABS_PATH =
  `/${SETTINGS_REL_PATH}/${NOTIFICATIONS_REL_PATH}` as const
export const NOTIFICATIONS_ROUTERS_REL_PATH = 'routers' as const
export const NOTIFICATIONS_ROUTERS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_ROUTERS_REL_PATH}` as const
export const NOTIFICATIONS_SINKS_REL_PATH = 'sinks' as const
export const NOTIFICATIONS_SINKS_ABS_PATH =
  `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_SINKS_REL_PATH}` as const
export const NOTIFICATIONS_BASE_CRUMBS = [
  { label: 'settings', url: SETTINGS_ABS_PATH },
  { label: 'notifications', url: NOTIFICATIONS_ABS_PATH },
] as const satisfies readonly Breadcrumb[]
