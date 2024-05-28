import { Navigate, Route } from 'react-router-dom'

import Stacks from '../components/stacks/Stacks'
import StackRunDetail from '../components/stacks/run/Route'
import StackRunProgress from '../components/stacks/run/progress/Progress'
import StackRunOutput from '../components/stacks/run/output/Output'
import StackRunRepository from '../components/stacks/run/repository/Repository'
import StackRunPlan from '../components/stacks/run/plan/Plan'

import StackRunState from '../components/stacks/run/state/State'

import StackRuns from '../components/stacks/StackRuns'
import StackFiles from '../components/stacks/StackFiles'
import StackConfiguration from '../components/stacks/StackConfiguration'
import StackEnvironment from '../components/stacks/StackEnvironment'
import StackJob from '../components/stacks/StackJob'

import StackOverview from '../components/stacks/StackOverview'

import StackRepository from '../components/stacks/StackRepository'

import {
  STACKS_ABS_PATH,
  STACK_CONFIGURATION_REL_PATH,
  STACK_ENV_REL_PATH,
  STACK_FILES_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_OVERVIEW_REL_PATH,
  STACK_REPOSITORY_REL_PATH,
  STACK_RUNS_ABS_PATH,
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
  STACK_RUNS_STATE_REL_PATH,
} from './stacksRoutesConsts'

export const stacksRoutes = [
  <Route
    path={STACKS_ABS_PATH}
    element={<Stacks />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={STACK_OVERVIEW_REL_PATH}
        />
      }
    />
    <Route
      path={STACK_OVERVIEW_REL_PATH}
      element={<StackOverview />}
    />
    <Route
      path={STACK_RUNS_REL_PATH}
      element={<StackRuns />}
    />
    <Route
      path={STACK_CONFIGURATION_REL_PATH}
      element={<StackConfiguration />}
    />
    <Route
      path={STACK_REPOSITORY_REL_PATH}
      element={<StackRepository />}
    />
    <Route
      path={STACK_ENV_REL_PATH}
      element={<StackEnvironment />}
    />
    <Route
      path={STACK_FILES_REL_PATH}
      element={<StackFiles />}
    />
    <Route
      path={STACK_JOB_REL_PATH}
      element={<StackJob />}
    />
  </Route>,
  <Route
    path={STACK_RUNS_ABS_PATH}
    element={<StackRunDetail />}
  >
    <Route
      index
      element={<StackRunProgress />}
    />
    <Route
      path={STACK_RUNS_REPOSITORY_REL_PATH}
      element={<StackRunRepository />}
    />
    <Route
      path={STACK_RUNS_PLAN_REL_PATH}
      element={<StackRunPlan />}
    />
    <Route
      path={STACK_RUNS_STATE_REL_PATH}
      element={<StackRunState />}
    />
    <Route
      path={STACK_RUNS_OUTPUT_REL_PATH}
      element={<StackRunOutput />}
    />
  </Route>,
]
