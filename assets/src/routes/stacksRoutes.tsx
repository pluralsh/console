import { Navigate, Route } from 'react-router-dom'

import RunJob from 'components/stacks/run/job/RunJob'

import RunJobLogs from 'components/stacks/run/job/RunJobLogs'

import RunJobStatus from 'components/stacks/run/job/RunJobStatus'

import RunJobPods from 'components/stacks/run/job/RunJobPods'

import RunJobSpecs from 'components/stacks/run/job/RunJobSpecs'

import { StackPrs } from 'components/stacks/prs/StackPrs'
import Violations from '../components/stacks/run/violations/Violations.tsx'

import Stacks from '../components/stacks/Stacks'
import StackRunDetail from '../components/stacks/run/Route'
import StackRunProgress from '../components/stacks/run/progress/Progress'
import StackRunOutput from '../components/stacks/run/output/Output'
import StackRunRepository from '../components/stacks/run/repository/Repository'
import StackRunPlan from '../components/stacks/run/plan/Plan'

import StackRunState from '../components/stacks/run/state/State'

import StackRuns from '../components/stacks/runs/StackRuns'
import StackFiles from '../components/stacks/files/StackFiles'
import StackEnvironment from '../components/stacks/environment/StackEnvironment'
import StackJob from '../components/stacks/job/StackJob'

import StackOverview from '../components/stacks/overview/StackOverview'

import StackOutput from '../components/stacks/output/StackOutput'

import StackState from '../components/stacks/state/StackState'

import {
  STACKS_ABS_PATH,
  STACK_ENV_REL_PATH,
  STACK_FILES_REL_PATH,
  STACK_INSIGHTS_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_OUTPUT_REL_PATH,
  STACK_OVERVIEW_REL_PATH,
  STACK_PRS_REL_PATH,
  STACK_RUNS_ABS_PATH,
  STACK_RUNS_INSIGHTS_REL_PATH,
  STACK_RUNS_JOB_REL_PATH,
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
  STACK_RUNS_STATE_REL_PATH,
  STACK_STATE_REL_PATH,
  STACK_VARS_REL_PATH,
  STACK_RUNS_VIOLATIONS_REL_PATH,
} from './stacksRoutesConsts'
import StackVariables from '../components/stacks/variables/StackVariables.tsx'
import { StackInsights } from 'components/stacks/insights/StackInsights.tsx'
import { StackRunInsights } from 'components/stacks/run/insights/StackRunInsights.tsx'

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
          to={STACK_RUNS_REL_PATH}
        />
      }
    />
    <Route
      path={STACK_RUNS_REL_PATH}
      element={<StackRuns />}
    />
    <Route
      path={STACK_PRS_REL_PATH}
      element={<StackPrs />}
    />
    <Route
      path={STACK_STATE_REL_PATH}
      element={<StackState />}
    />
    <Route
      path={STACK_OUTPUT_REL_PATH}
      element={<StackOutput />}
    />
    <Route
      path={STACK_OVERVIEW_REL_PATH}
      element={<StackOverview />}
    />
    <Route
      path={STACK_VARS_REL_PATH}
      element={<StackVariables />}
    />
    <Route
      path={STACK_INSIGHTS_REL_PATH}
      element={<StackInsights />}
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
      path={STACK_RUNS_INSIGHTS_REL_PATH}
      element={<StackRunInsights />}
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
    <Route
      key="run-jobs"
      path={STACK_RUNS_JOB_REL_PATH}
      element={<RunJob />}
    >
      <Route
        index
        element={
          <Navigate
            replace
            to="logs"
          />
        }
      />
      <Route
        path="logs"
        element={<RunJobLogs />}
      />
      <Route
        path="pods"
        element={<RunJobPods />}
      />
      <Route
        path="status"
        element={<RunJobStatus />}
      />
      <Route
        path="specs/:tab?"
        element={<RunJobSpecs />}
      />
    </Route>
    <Route
      key="violations"
      path={STACK_RUNS_VIOLATIONS_REL_PATH}
      element={<Violations />}
    />
  </Route>,
]
