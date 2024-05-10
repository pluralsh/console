import { Route } from 'react-router-dom'

import Stacks from '../components/stacks/Stacks'
import StackRunDetail from '../components/stacks/run/Route'
import StackRunProgress from '../components/stacks/run/progress/Progress'
import StackRunState from '../components/stacks/run/State'

import {
  STACKS_ABS_PATH,
  STACK_RUNS_ABS_PATH,
  STACK_RUNS_STATE_REL_PATH,
} from './stacksRoutesConsts'

export const stacksRoutes = [
  <Route
    path={STACKS_ABS_PATH}
    element={<Stacks />}
  />,
  <Route
    path={STACK_RUNS_ABS_PATH}
    element={<StackRunDetail />}
  >
    <Route
      index
      element={<StackRunProgress />}
    />
    <Route
      path={STACK_RUNS_STATE_REL_PATH}
      element={<StackRunState />}
    />
  </Route>,
]
