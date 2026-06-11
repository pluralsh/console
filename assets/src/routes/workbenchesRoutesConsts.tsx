export const WORKBENCHES_ABS_PATH = '/workbenches'

export const WORKBENCHES_TOOLS_PARAM_ID = 'toolId'
export const WORKBENCH_PARAM_ID = 'workbenchId'
export const WORKBENCHES_CRON_PARAM_ID = 'cronId'
export const WORKBENCHES_SAVED_PROMPT_PARAM_ID = 'savedPromptId'
export const WORKBENCHES_WEBHOOK_PARAM_ID = 'webhookId'
export const WORKBENCHES_CHATBOT_PARAM_ID = 'chatbotId'
export const WORKBENCHES_CREATE_REL_PATH = 'create'
export const WORKBENCHES_EDIT_REL_PATH = 'edit'
export const WORKBENCHES_CRON_SCHEDULES_REL_PATH = 'cron-schedules'
export const WORKBENCHES_SAVED_PROMPTS_REL_PATH = 'saved-prompts'
export const WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH = 'webhook-triggers'
export const WORKBENCHES_CHATBOTS_REL_PATH = 'chatbots'
export const WORKBENCH_EVAL_SETTINGS_REL_PATH = 'eval-settings'
export const WORKBENCHES_WEBHOOK_TRIGGERS_CREATE_WEBHOOK_REL_PATH =
  'create-webhook'
export const WORKBENCHES_WEBHOOK_SELECTED_QUERY_PARAM = 'selectedWebhook'
export const WORKBENCHES_CHATBOTS_CREATE_CHATBOT_REL_PATH = 'create-chatbot'
export const WORKBENCHES_CHATBOT_SELECTED_QUERY_PARAM = 'selectedChatbot'

export const WORKBENCHES_TOOLS_REL_PATH = 'tools'
export const WORKBENCHES_TOOLS_ADD_REL_PATH = 'integrations'
export const WORKBENCHES_TOOLS_YOUR_REL_PATH = 'configured-tools'
export const WORKBENCHES_EVALS_REL_PATH = 'evals'
export const WORKBENCH_EVAL_RESULT_PARAM_ID = 'evalResultId'
export const WORKBENCHES_ALERTS_REL_PATH = 'alerts'
export const WORKBENCHES_ISSUES_REL_PATH = 'issues'
export const WORKBENCHES_TOOLS_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_TOOLS_ADD_REL_PATH}`
export const WORKBENCHES_TOOLS_ADD_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_TOOLS_ADD_REL_PATH}`
export const WORKBENCHES_TOOLS_YOUR_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_TOOLS_YOUR_REL_PATH}`
export const WORKBENCHES_TOOLS_CREATE_ABS_PATH = `${WORKBENCHES_TOOLS_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`
export const WORKBENCHES_TOOLS_CREATE_CLOUD_CONNECTION_REL_PATH =
  'create-cloud-connection'
export const WORKBENCHES_TOOLS_CREATE_CLOUD_CONNECTION_ABS_PATH = `${WORKBENCHES_TOOLS_CREATE_ABS_PATH}/${WORKBENCHES_TOOLS_CREATE_CLOUD_CONNECTION_REL_PATH}`
export const CLOUD_CONNECTION_SELECTED_QUERY_PARAM = 'selectedCloudConnection'
export const WORKBENCHES_TOOLS_CREATE_MCP_SERVER_REL_PATH = 'create-mcp-server'
export const WORKBENCHES_TOOLS_CREATE_MCP_SERVER_ABS_PATH = `${WORKBENCHES_TOOLS_CREATE_ABS_PATH}/${WORKBENCHES_TOOLS_CREATE_MCP_SERVER_REL_PATH}`
export const MCP_SERVER_SELECTED_QUERY_PARAM = 'selectedMcpServer'
export const WORKBENCHES_TOOLS_EDIT_ABS_PATH = `${WORKBENCHES_TOOLS_YOUR_ABS_PATH}/:${WORKBENCHES_TOOLS_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`
export const getWorkbenchToolEditAbsPath = (toolId: Nullable<string>) =>
  `${WORKBENCHES_TOOLS_YOUR_ABS_PATH}/${toolId ?? ''}/${WORKBENCHES_EDIT_REL_PATH}`

export const WORKBENCHES_CREATE_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchAbsPath = (workbenchId: Nullable<string>) =>
  `${WORKBENCHES_ABS_PATH}/${workbenchId ?? ''}`

export const getWorkbenchCronSchedulesAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}`

export const getWorkbenchCronScheduleCreateAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchCronSchedulesAbsPath(workbenchId)}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchCronScheduleEditAbsPath = ({
  workbenchId,
  cronId,
}: {
  workbenchId: Nullable<string>
  cronId: Nullable<string>
}) =>
  `${getWorkbenchCronSchedulesAbsPath(workbenchId)}/${cronId ?? ''}/${WORKBENCHES_EDIT_REL_PATH}`

export const getWorkbenchSavedPromptsAbsPath = (
  workbenchId: Nullable<string>
) => `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_SAVED_PROMPTS_REL_PATH}`

export const getWorkbenchSavedPromptCreateAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchSavedPromptsAbsPath(workbenchId)}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchSavedPromptEditAbsPath = ({
  workbenchId,
  savedPromptId,
}: {
  workbenchId: Nullable<string>
  savedPromptId: Nullable<string>
}) =>
  `${getWorkbenchSavedPromptsAbsPath(workbenchId)}/${savedPromptId ?? ''}/${WORKBENCHES_EDIT_REL_PATH}`

export const getWorkbenchWebhookTriggersAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}`

export const getWorkbenchWebhookTriggerCreateAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchWebhookTriggersAbsPath(workbenchId)}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchWebhookTriggerCreateWebhookAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchWebhookTriggersAbsPath(workbenchId)}/${WORKBENCHES_WEBHOOK_TRIGGERS_CREATE_WEBHOOK_REL_PATH}`

export const getWorkbenchWebhookTriggerEditAbsPath = ({
  workbenchId,
  webhookId,
}: {
  workbenchId: Nullable<string>
  webhookId: Nullable<string>
}) =>
  `${getWorkbenchWebhookTriggersAbsPath(workbenchId)}/${webhookId ?? ''}/${WORKBENCHES_EDIT_REL_PATH}`

export const getWorkbenchChatbotsAbsPath = (workbenchId: Nullable<string>) =>
  `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_CHATBOTS_REL_PATH}`

export const getWorkbenchChatbotCreateAbsPath = (
  workbenchId: Nullable<string>
) =>
  `${getWorkbenchChatbotsAbsPath(workbenchId)}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchChatbotEditAbsPath = ({
  workbenchId,
  chatbotId,
}: {
  workbenchId: Nullable<string>
  chatbotId: Nullable<string>
}) =>
  `${getWorkbenchChatbotsAbsPath(workbenchId)}/${chatbotId ?? ''}/${WORKBENCHES_EDIT_REL_PATH}`

export const getWorkbenchEvalSettingsAbsPath = (
  workbenchId: Nullable<string>
) => `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCH_EVAL_SETTINGS_REL_PATH}`

export const getWorkbenchEvalsAbsPath = (workbenchId: Nullable<string>) =>
  `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_EVALS_REL_PATH}`

export const getWorkbenchEvalResultAbsPath = ({
  workbenchId,
  evalResultId,
}: {
  workbenchId: Nullable<string>
  evalResultId: Nullable<string>
}) =>
  evalResultId
    ? `${getWorkbenchEvalsAbsPath(workbenchId)}/${encodeURIComponent(evalResultId)}`
    : getWorkbenchEvalsAbsPath(workbenchId)

export const getWorkbenchJobAbsPath = ({
  workbenchId,
  jobId,
}: {
  workbenchId: string
  jobId: string
}) => `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCH_JOBS_REL_PATH}/${jobId}`

export const WORKBENCH_JOBS_REL_PATH = 'jobs'
export const WORKBENCH_JOBS_PARAM_JOB = 'jobId'
export const WORKBENCH_JOB_ABS_PATH = getWorkbenchJobAbsPath({
  workbenchId: `:${WORKBENCH_PARAM_ID}`,
  jobId: `:${WORKBENCH_JOBS_PARAM_JOB}`,
})

export const WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS = `${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}/*`
export const WORKBENCH_CHATBOTS_PATH_MATCHER_ABS = `${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_CHATBOTS_REL_PATH}/*`
export const WORKBENCH_JOBS_PATH_MATCHER_ABS = `${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCH_JOBS_REL_PATH}/*`
export const WORKBENCH_TOOLS_ADD_PATH_MATCHER_ABS = `${WORKBENCHES_TOOLS_ADD_ABS_PATH}/*`
export const WORKBENCH_TOOLS_YOUR_PATH_MATCHER_ABS = `${WORKBENCHES_TOOLS_YOUR_ABS_PATH}/*`
