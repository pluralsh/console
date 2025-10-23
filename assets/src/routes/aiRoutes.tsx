import { AI } from 'components/ai/AI.tsx'
import { AIThreads } from 'components/ai/AIThreads.tsx'
import { McpServers } from 'components/ai/mcp/McpServers.tsx'
import { Sentinel } from 'components/ai/sentinels/sentinel/Sentinel.tsx'
import { SentinelRun } from 'components/ai/sentinels/sentinel/run/SentinelRun.tsx'
import { Sentinels } from 'components/ai/sentinels/Sentinels.tsx'
import { Navigate, Route } from 'react-router-dom'
import { AIAgentSessions } from '../components/ai/AIAgentSessions.tsx'
import {
  AI_ABS_PATH,
  AI_AGENT_RUNS_ABS_PATH,
  AI_AGENT_RUNS_PARAM_RUN_ID,
  AI_AGENT_RUNS_REL_PATH,
  AI_AGENT_RUNTIMES_REL_PATH,
  AI_AGENT_SESSIONS_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_SENTINELS_ABS_PATH,
  AI_SENTINELS_REL_PATH,
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  AI_SENTINELS_RUNS_REL_PATH,
  AI_THREADS_REL_PATH,
} from './aiRoutesConsts'
import { AIAgentRuntimes } from 'components/ai/agent-runtimes/AIAgentRuntimes.tsx'
import { AIAgentRuns } from 'components/ai/agent-runs/AIAgentRuns.tsx'
import { AIAgentRun } from 'components/ai/agent-runs/AIAgentRun.tsx'

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
  </Route>,
  // other sentinel routes
  <Route
    path={`${AI_SENTINELS_ABS_PATH}/:id`}
    element={<Sentinel />}
  />,
  <Route
    path={`${AI_SENTINELS_ABS_PATH}/:id/${AI_SENTINELS_RUNS_REL_PATH}/:${AI_SENTINELS_RUNS_PARAM_RUN_ID}`}
    element={<SentinelRun />}
  />,
  // other agent routes
  <Route
    path={`${AI_AGENT_RUNS_ABS_PATH}/:${AI_AGENT_RUNS_PARAM_RUN_ID}`}
    element={<AIAgentRun />}
  />,
]
