import { Navigate, Route } from 'react-router-dom'
import { AIThreads } from 'components/ai/AIThreads.tsx'
import { AI } from 'components/ai/AI.tsx'
import { McpServers } from 'components/ai/mcp/McpServers.tsx'
import { AIAgent } from '../components/ai/AIAgent.tsx'
import {
  AI_ABS_PATH,
  AI_THREADS_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
  AI_AGENT_REL_PATH,
  AI_SENTINELS_REL_PATH,
  AI_SENTINELS_ABS_PATH,
} from './aiRoutesConsts'
import { Sentinels } from 'components/ai/sentinel/Sentinels.tsx'
import { Sentinel } from 'components/ai/sentinel/Sentinel.tsx'

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
]
