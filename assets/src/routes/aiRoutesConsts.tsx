export const AI_ABS_PATH = '/ai'

export const AI_AGENT_SESSIONS_REL_PATH = 'agent-sessions'

export const AI_THREADS_REL_PATH = 'threads'

export const AI_MCP_SERVERS_REL_PATH = 'mcp-servers'

export const AI_INFRA_RESEARCH_REL_PATH = 'infra-research'
export const AI_INFRA_RESEARCH_ABS_PATH = `${AI_ABS_PATH}/${AI_INFRA_RESEARCH_REL_PATH}`
export const AI_INFRA_RESEARCH_DIAGRAM_REL_PATH = 'diagram'
export const AI_INFRA_RESEARCH_ANALYSIS_REL_PATH = 'analysis'

export const AI_SENTINELS_REL_PATH = 'sentinels'
export const AI_SENTINELS_RUNS_REL_PATH = 'runs'
export const AI_SENTINELS_RUNS_JOBS_REL_PATH = 'jobs'
export const AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH = 'output'
export const AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH = 'job'

export const AI_AGENT_RUNTIMES_REL_PATH = 'agent-runtimes'
export const AI_AGENT_RUNS_REL_PATH = 'agent-runs'
export const AI_AGENT_RUNS_PROGRESS_REL_PATH = 'progress'
export const AI_AGENT_RUNS_ANALYSIS_REL_PATH = 'analysis'
export const AI_AGENT_RUNS_PULL_REQUESTS_REL_PATH = 'prs'
export const AI_AGENT_RUNS_LOGS_REL_PATH = 'logs'

export const AI_AGENT_SESSIONS_ABS_PATH = `${AI_ABS_PATH}/${AI_AGENT_SESSIONS_REL_PATH}`
export const AI_AGENT_RUNS_ABS_PATH = `${AI_ABS_PATH}/${AI_AGENT_RUNS_REL_PATH}`
export const AI_MCP_SERVERS_ABS_PATH = `${AI_ABS_PATH}/${AI_MCP_SERVERS_REL_PATH}`
export const AI_SENTINELS_ABS_PATH = `${AI_ABS_PATH}/${AI_SENTINELS_REL_PATH}`

export const AI_SENTINELS_RUNS_PARAM_SENTINEL_ID = 'id'
export const AI_SENTINELS_RUNS_PARAM_RUN_ID = 'runId'
export const AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID = 'jobId'
export const AI_AGENT_RUNS_PARAM_RUN_ID = 'runId'
export const AI_INFRA_RESEARCH_PARAM_ID = 'researchId'

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
}: {
  agentRunId: Nullable<string>
}) => `${AI_AGENT_RUNS_ABS_PATH}/${agentRunId ?? ''}`

export const getInfraResearchAbsPath = ({
  infraResearchId,
  tab,
}: {
  infraResearchId: Nullable<string>
  tab?: string
}) => `${AI_INFRA_RESEARCH_ABS_PATH}/${infraResearchId ?? ''}/${tab ?? ''}`
