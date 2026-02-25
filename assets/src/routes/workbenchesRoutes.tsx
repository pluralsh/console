import { WorkbenchIntegrations } from 'components/workbenches/WorkbenchIntegrations'
import { Workbenches } from 'components/workbenches/Workbenches'
import { WorkbenchesList } from 'components/workbenches/WorkbenchesList'
import { Route } from 'react-router-dom'
import {
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_INTEGRATIONS_REL_PATH,
} from './workbenchesRoutesConsts'
import { Workbench } from 'components/workbenches/workbench/Workbench'

export const workbenchesRoutes = [
  <Route
    path={WORKBENCHES_ABS_PATH}
    element={<Workbenches />}
  >
    <Route
      index
      element={<WorkbenchesList />}
    />
    <Route
      path={WORKBENCHES_INTEGRATIONS_REL_PATH}
      element={<WorkbenchIntegrations />}
    />
  </Route>,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}`}
    element={<Workbench />}
  />,
]
