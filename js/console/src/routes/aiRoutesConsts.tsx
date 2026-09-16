import { AI_SETTINGS_MCP_SERVERS_ABS_PATH } from './settingsRoutesConst'

export const AI_ABS_PATH = '/ai'

export const AI_THREADS_REL_PATH = 'threads'

export const AI_MCP_SERVERS_REL_PATH = 'mcp-servers'

export const AI_INFRA_RESEARCH_REL_PATH = 'infra-research'
export const AI_INFRA_RESEARCH_ABS_PATH = `${AI_ABS_PATH}/${AI_INFRA_RESEARCH_REL_PATH}`

export const AI_SENTINELS_REL_PATH = 'sentinels'
export const AI_SENTINELS_RUNS_REL_PATH = 'runs'
export const AI_SENTINELS_RUNS_JOBS_REL_PATH = 'jobs'
export const AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH = 'output'
export const AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH = 'job'

export const AI_AGENT_RUNS_REL_PATH = 'agent-runs'

export const AI_AGENT_RUNS_ABS_PATH = `${AI_ABS_PATH}/${AI_AGENT_RUNS_REL_PATH}`
export const AI_MCP_SERVERS_ABS_PATH = AI_SETTINGS_MCP_SERVERS_ABS_PATH
export const AI_SENTINELS_ABS_PATH = `${AI_ABS_PATH}/${AI_SENTINELS_REL_PATH}`

export const AI_SENTINELS_RUNS_PARAM_SENTINEL_ID = 'id'
export const AI_SENTINELS_RUNS_PARAM_RUN_ID = 'runId'
export const AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID = 'jobId'
export const AI_AGENT_RUNS_PARAM_RUN_ID = 'runId'
export const AI_INFRA_RESEARCH_PARAM_ID = 'researchId'
export const AI_AGENT_RUN_BACK_SOURCE_PARAM = 'from'
export const AI_AGENT_RUN_BACK_TO_PARAM = 'backTo'
export const AI_AGENT_RUN_BACK_LABEL_PARAM = 'backLabel'
export const AI_AGENT_RUN_BACK_SOURCE_WORKBENCH = 'workbench'

export const getSentinelAbsPath = (id: string) =>
  `${AI_SENTINELS_ABS_PATH}/${id}`

export const getSentinelRunAbsPath = ({
  sentinelId,
  runId,
}: {
  sentinelId: string
  runId: string
}) => `${getSentinelAbsPath(sentinelId)}/${AI_SENTINELS_RUNS_REL_PATH}/${runId}`

export const getSentinelRunJobAbsPath = ({
  sentinelId,
  runId,
  jobId,
}: {
  sentinelId: string
  runId: string
  jobId: string
}) =>
  `${getSentinelRunAbsPath({ sentinelId, runId })}/${AI_SENTINELS_RUNS_JOBS_REL_PATH}/${jobId}`

export const getAgentRunAbsPath = ({
  agentRunId,
  backTo,
  backLabel,
}: {
  agentRunId: Nullable<string>
  backTo?: string
  backLabel?: string
}) => {
  const path = `${AI_AGENT_RUNS_ABS_PATH}/${agentRunId ?? ''}`
  if (!backTo) return path

  const params = new URLSearchParams({
    [AI_AGENT_RUN_BACK_SOURCE_PARAM]: AI_AGENT_RUN_BACK_SOURCE_WORKBENCH,
    [AI_AGENT_RUN_BACK_TO_PARAM]: backTo,
    ...(backLabel ? { [AI_AGENT_RUN_BACK_LABEL_PARAM]: backLabel } : {}),
  })

  return `${path}?${params}`
}

export const AI_AGENT_RUN_ABS_PATH = `${AI_AGENT_RUNS_ABS_PATH}/:${AI_AGENT_RUNS_PARAM_RUN_ID}`

export const AI_AGENT_RUNS_PATH_MATCHER_ABS = AI_AGENT_RUN_ABS_PATH

export const getInfraResearchAbsPath = ({
  infraResearchId,
}: {
  infraResearchId: Nullable<string>
}) => `${AI_INFRA_RESEARCH_ABS_PATH}/${infraResearchId ?? ''}`
