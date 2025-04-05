import { Navigate, Route } from 'react-router-dom'
import { AIThreads } from 'components/ai/AIThreads.tsx'
import { AI } from 'components/ai/AI.tsx'
import { McpServers } from 'components/ai/McpServers.tsx'
import {
  AI_ABS_PATH,
  AI_THREADS_REL_PATH,
  AI_MCP_SERVERS_REL_PATH,
} from './aiRoutesConsts'

export const aiRoutes = (
  <Route
    path={AI_ABS_PATH}
    element={<AI />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={AI_THREADS_REL_PATH}
        />
      }
    />
    <Route
      path={AI_THREADS_REL_PATH}
      element={<AIThreads />}
    />
    <Route
      path={AI_MCP_SERVERS_REL_PATH}
      element={<McpServers />}
    />
  </Route>
)
