import { AI } from 'components/ai/AI.tsx'
import { AIThreads } from 'components/ai/AIThreads.tsx'
import { McpServers } from 'components/ai/mcp/McpServers.tsx'
import { Sentinel } from 'components/ai/sentinels/sentinel/Sentinel.tsx'
import { SentinelRun } from 'components/ai/sentinels/sentinel/run/SentinelRun.tsx'
import { Sentinels } from 'components/ai/sentinels/Sentinels.tsx'
import { Navigate, Route } from 'react-router-dom'
import { AIAgent } from '../components/ai/AIAgent.tsx'
import {
  AI_ABS_PATH,
  AI_AGENT_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_SENTINELS_ABS_PATH,
  AI_SENTINELS_REL_PATH,
  AI_SENTINELS_RUNS_PARAM_RUN_ID,
  AI_SENTINELS_RUNS_REL_PATH,
  AI_THREADS_REL_PATH,
} from './aiRoutesConsts'

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
          to={AI_AGENT_REL_PATH}
        />
      }
    />
    <Route
      path={AI_AGENT_REL_PATH}
      element={<AIAgent />}
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
  <Route
    path={`${AI_SENTINELS_ABS_PATH}/:id`}
    element={<Sentinel />}
  />,
  <Route
    path={`${AI_SENTINELS_ABS_PATH}/:id/${AI_SENTINELS_RUNS_REL_PATH}/:${AI_SENTINELS_RUNS_PARAM_RUN_ID}`}
    element={<SentinelRun />}
  />,
]
