import {
  AgentRunAnalysis,
  AgentRunLogs,
  AgentRunMessages,
  AgentRunPullRequests,
  AIAgentRun,
} from 'components/ai/agent-runs/AIAgentRun.tsx'
import { AIAgentRuns } from 'components/ai/agent-runs/AIAgentRuns.tsx'
import { AIAgentRuntimes } from 'components/ai/agent-runtimes/AIAgentRuntimes.tsx'
import { AI } from 'components/ai/AI.tsx'
import { AIThreads } from 'components/ai/AIThreads.tsx'
import { McpServers } from 'components/ai/mcp/McpServers.tsx'
import { SentinelRunJob } from 'components/ai/sentinels/sentinel/run/jobs/job/SentinelRunJob.tsx'
import { SentinelRunJobK8sJob } from 'components/ai/sentinels/sentinel/run/jobs/job/SentinelRunJobK8sJob.tsx'
import { SentinelRunJobOutput } from 'components/ai/sentinels/sentinel/run/jobs/job/SentinelRunJobOutput.tsx'
import { SentinelRun } from 'components/ai/sentinels/sentinel/run/SentinelRun.tsx'
import { Sentinel } from 'components/ai/sentinels/sentinel/Sentinel.tsx'
import { Sentinels } from 'components/ai/sentinels/Sentinels.tsx'
import { Navigate, Route } from 'react-router-dom'
import { AIAgentSessions } from '../components/ai/AIAgentSessions.tsx'
import {
  AI_ABS_PATH,
  AI_AGENT_RUNS_ABS_PATH,
  AI_AGENT_RUNS_ANALYSIS_REL_PATH,
  AI_AGENT_RUNS_LOGS_REL_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_PROGRESS_REL_PATH,
  AI_AGENT_RUNS_PULL_REQUESTS_REL_PATH,
  AI_AGENT_RUNS_REL_PATH,
  AI_AGENT_RUNTIMES_REL_PATH,
  AI_AGENT_SESSIONS_REL_PATH,
  AI_INFRA_RESEARCH_ABS_PATH,
  AI_INFRA_RESEARCH_PARAM_ID,
  AI_INFRA_RESEARCH_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_SENTINELS_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH,
  AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID,
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  AI_SENTINELS_RUNS_PARAM_SENTINEL_ID,
  AI_THREADS_REL_PATH,
  getSentinelAbsPath,
  getSentinelRunAbsPath,
  getSentinelRunJobAbsPath,
} from './aiRoutesConsts'
import { getPodDetailsRoutes } from './cdRoutes.tsx'
import { jobRoutes } from './jobRoutes.tsx'
import { InfraResearches } from 'components/ai/infra-research/InfraResearches.tsx'
import { InfraResearch } from 'components/ai/infra-research/InfraResearch.tsx'

export const aiRoutes = [
  <Route
    path={AI_ABS_PATH}
    element={<AI />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={AI_AGENT_SESSIONS_REL_PATH}
        />
      }
    />
    <Route
      path={AI_AGENT_SESSIONS_REL_PATH}
      element={<AIAgentSessions />}
    />
    <Route
      path={AI_AGENT_RUNTIMES_REL_PATH}
      element={<AIAgentRuntimes />}
    />
    <Route
      path={AI_AGENT_RUNS_REL_PATH}
      element={<AIAgentRuns />}
    />
    <Route
      path={AI_THREADS_REL_PATH}
      element={<AIThreads />}
    />
    <Route
      path={AI_MCP_SERVERS_REL_PATH}
      element={<McpServers />}
    />
    <Route
      path={AI_SENTINELS_REL_PATH}
      element={<Sentinels />}
    />
    <Route
      path={AI_INFRA_RESEARCH_REL_PATH}
      element={<InfraResearches />}
    />
  </Route>,
  <Route
    path={`${AI_INFRA_RESEARCH_ABS_PATH}/:${AI_INFRA_RESEARCH_PARAM_ID}`}
    element={<InfraResearch />}
  />,
  // other agent routes
  <Route
    path={`${AI_AGENT_RUNS_ABS_PATH}/:${AI_AGENT_RUNS_PARAM_RUN_ID}`}
    element={<AIAgentRun />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={AI_AGENT_RUNS_PROGRESS_REL_PATH}
        />
      }
    />
    <Route
      path={AI_AGENT_RUNS_PROGRESS_REL_PATH}
      element={<AgentRunMessages />}
    />
    <Route
      path={AI_AGENT_RUNS_ANALYSIS_REL_PATH}
      element={<AgentRunAnalysis />}
    />
    <Route
      path={AI_AGENT_RUNS_PULL_REQUESTS_REL_PATH}
      element={<AgentRunPullRequests />}
    />
    <Route
      path={AI_AGENT_RUNS_LOGS_REL_PATH}
      element={<AgentRunLogs />}
    />
    {getPodDetailsRoutes('agent-run')}
  </Route>,
  // other sentinel routes
  <Route
    path={getSentinelAbsPath(`:${AI_SENTINELS_RUNS_PARAM_SENTINEL_ID}`)}
    element={<Sentinel />}
  />,
  <Route
    path={getSentinelRunAbsPath({
      sentinelId: `:${AI_SENTINELS_RUNS_PARAM_SENTINEL_ID}`,
      runId: `:${AI_SENTINELS_RUNS_PARAM_RUN_ID}`,
    })}
    element={<SentinelRun />}
  />,
  <Route
    path={getSentinelRunJobAbsPath({
      sentinelId: `:${AI_SENTINELS_RUNS_PARAM_SENTINEL_ID}`,
      runId: `:${AI_SENTINELS_RUNS_PARAM_RUN_ID}`,
      jobId: `:${AI_SENTINELS_RUNS_JOBS_PARAM_JOB_ID}`,
    })}
    element={<SentinelRunJob />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH}
        />
      }
    />
    <Route
      path={AI_SENTINELS_RUNS_JOBS_OUTPUT_REL_PATH}
      element={<SentinelRunJobOutput />}
    />
    <Route
      path={AI_SENTINELS_RUNS_JOBS_K8S_JOB_REL_PATH}
      element={<SentinelRunJobK8sJob />}
    >
      {jobRoutes}
    </Route>
  </Route>,
]
