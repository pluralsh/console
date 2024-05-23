import { Navigate, Route } from 'react-router-dom'

import Stacks from '../components/stacks/Stacks'
import StackRunDetail from '../components/stacks/stack/run/Route'
import StackRunProgress from '../components/stacks/stack/run/progress/Progress'
import StackRunOutput from '../components/stacks/stack/run/output/Output'
import StackRunRepository from '../components/stacks/stack/run/repository/Repository'
import StackRunPlan from '../components/stacks/stack/run/plan/Plan'

import StackRunState from '../components/stacks/stack/run/state/State'

import Stack from '../components/stacks/stack/Stack'

import StackRuns from '../components/stacks/stack/StackRuns'
import StackRepository from '../components/stacks/stack/repository/StackRepository'
import StackConfiguration from '../components/stacks/stack/configuration/StackConfiguration'
import StackEnvironment from '../components/stacks/stack/environment/StackEnvironment'
import StackJob from '../components/stacks/stack/job/StackJob'

import {
  STACKS_ABS_PATH,
  STACK_ABS_PATH,
  STACK_CONFIG_REL_PATH,
  STACK_ENV_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_REPO_REL_PATH,
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
  />,
  <Route
    path={STACK_ABS_PATH}
    element={<Stack />}
  >
    <Route
      index
      element={
        <Navigate
          replace
          to={STACK_RUNS_REL_PATH}
        />
      }
    />
    <Route
      path={STACK_RUNS_REL_PATH}
      element={<StackRuns />}
    />
    <Route
      path={STACK_CONFIG_REL_PATH}
      element={<StackConfiguration />}
    />
    <Route
      path={STACK_REPO_REL_PATH}
      element={<StackRepository />}
    />
    <Route
      path={STACK_ENV_REL_PATH}
      element={<StackEnvironment />}
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
