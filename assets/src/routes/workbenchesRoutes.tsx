import { Workbenches } from 'components/workbenches/Workbenches'
import { WorkbenchesList } from 'components/workbenches/WorkbenchesList'
import { WorkbenchesAlerts } from 'components/workbenches/WorkbenchesAlerts'
import { WorkbenchesIssues } from 'components/workbenches/WorkbenchesIssues'
import { WorkbenchToolCreateOrEdit } from 'components/workbenches/tools/WorkbenchToolCreateOrEdit'
import { WorkbenchTools } from 'components/workbenches/tools/WorkbenchTools'
import { Workbench } from 'components/workbenches/workbench/Workbench'
import { WorkbenchCreateOrEdit } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import { WorkbenchScheduleTrigger } from 'components/workbenches/workbench/triggers/WorkbenchScheduleTrigger'
import { WorkbenchWebhookTrigger } from 'components/workbenches/workbench/triggers/WorkbenchWebhookTrigger'
import { Route } from 'react-router-dom'
import {
  WORKBENCH_JOB_ABS_PATH,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_CREATE_REL_PATH,
  WORKBENCHES_EDIT_REL_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
  WORKBENCHES_TOOLS_ABS_PATH,
  WORKBENCHES_TOOLS_PARAM_ID,
  WORKBENCHES_TOOLS_REL_PATH,
  WORKBENCHES_CRON_SCHEDULES_REL_PATH,
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
} from './workbenchesRoutesConsts'
import { WorkbenchJob } from 'components/workbenches/workbench/job/WorkbenchJob'

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
      path={WORKBENCHES_TOOLS_REL_PATH}
      element={<WorkbenchTools />}
    />
    <Route
      path={WORKBENCHES_ALERTS_REL_PATH}
      element={<WorkbenchesAlerts />}
    />
    <Route
      path={WORKBENCHES_ISSUES_REL_PATH}
      element={<WorkbenchesIssues />}
    />
  </Route>,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<WorkbenchCreateOrEdit mode="create" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}`}
    element={<Workbench />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`}
    element={<WorkbenchCreateOrEdit mode="edit" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}`}
    element={<WorkbenchScheduleTrigger />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}`}
    element={<WorkbenchWebhookTrigger />}
  />,
  <Route
    path={`${WORKBENCHES_TOOLS_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<WorkbenchToolCreateOrEdit mode="create" />}
  />,
  <Route
    path={`${WORKBENCHES_TOOLS_ABS_PATH}/:${WORKBENCHES_TOOLS_PARAM_ID}`}
    element={<WorkbenchToolCreateOrEdit mode="edit" />}
  />,
  <Route
    path={WORKBENCH_JOB_ABS_PATH}
    element={<WorkbenchJob />}
  />,
]
