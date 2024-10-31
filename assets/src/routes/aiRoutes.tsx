import { Route } from 'react-router-dom'
import AI from '../components/ai/AI.tsx'

export const AI_ABS_PATH = '/ai'

export const aiRoutes = (
  <Route
    path={AI_ABS_PATH}
    element={<AI />}
  ></Route>
)
