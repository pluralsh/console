import { Route } from 'react-router-dom'

import Stacks from '../components/stacks/Stacks'
import StackRunDetail from '../components/stacks/run/Route'
import StackRunProgress from '../components/stacks/run/progress/Progress'
import StackRunOutput from '../components/stacks/run/output/Output'
import StackRunRepository from '../components/stacks/run/repository/Repository'
import StackRunPlan from '../components/stacks/run/plan/Plan'

import StackRunState from '../components/stacks/run/state/State'

import {
  STACKS_ABS_PATH,
  STACK_RUNS_ABS_PATH,
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
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

// {/* <Route */}
// {/*  index */}
// {/*  element={ */}
// {/*    <Navigate */}
// {/*      replace */}
// {/*      to={STACK_RUNS_REL_PATH} */}
// {/*    /> */}
// {/*  } */}
// {/* /> */}
// {/* <Route */}
// {/*  path={STACK_RUNS_REL_PATH} */}
// {/*  element={<StackRuns />} */}
// {/* /> */}
// {/* <Route */}
// {/*  path={STACK_CONFIG_REL_PATH} */}
// {/*  element={<StackConfiguration />} */}
// {/* /> */}
// {/* <Route */}
// {/*  path={STACK_REPO_REL_PATH} */}
// {/*  element={<StackRepository />} */}
// {/* /> */}
// {/* <Route */}
// {/*  path={STACK_ENV_REL_PATH} */}
// {/*  element={<StackEnvironment />} */}
// {/* /> */}
// {/* <Route */}
// {/*  path={STACK_JOB_REL_PATH} */}
// {/*  element={<StackJob />} */}
// {/* /> */}
