export const AI_ABS_PATH = '/ai'

export const AI_AGENT_REL_PATH = 'agent'
export const AI_THREADS_REL_PATH = 'threads'
export const AI_MCP_SERVERS_REL_PATH = 'mcp-servers'
export const AI_SENTINELS_REL_PATH = 'sentinels'
export const AI_SENTINELS_RUNS_REL_PATH = 'runs'
export const AI_SENTINELS_RUNS_JOBS_REL_PATH = 'jobs'

export const AI_AGENT_ABS_PATH = `${AI_ABS_PATH}/${AI_AGENT_REL_PATH}`
export const AI_AGENT_SESSIONS_ABS_PATH = `${AI_AGENT_ABS_PATH}/agent-sessions`
export const AI_MCP_SERVERS_ABS_PATH = `${AI_ABS_PATH}/${AI_MCP_SERVERS_REL_PATH}`
export const AI_SENTINELS_ABS_PATH = `${AI_ABS_PATH}/${AI_SENTINELS_REL_PATH}`

export const AI_SENTINELS_RUNS_PARAM_RUN_ID = 'runId'
export const AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID = 'jobId'

export const getSentinelAbsPath = (id: string) =>
  `${AI_SENTINELS_ABS_PATH}/${id}`
