import { Workbenches } from 'components/workbenches/Workbenches'
import { WorkbenchesList } from 'components/workbenches/WorkbenchesList'
import { WorkbenchesAlerts } from 'components/workbenches/WorkbenchesAlerts'
import { WorkbenchesIssues } from 'components/workbenches/WorkbenchesIssues'
import { WorkbenchToolCreateOrEdit } from 'components/workbenches/tools/WorkbenchToolCreateOrEdit'
import { WorkbenchToolsAdd } from 'components/workbenches/tools/WorkbenchToolsAdd'
import { ConfiguredTools } from 'components/workbenches/tools/ConfiguredTools'
import { Workbench } from 'components/workbenches/workbench/Workbench'
import { WorkbenchAlerts } from 'components/workbenches/workbench/WorkbenchAlerts'
import { WorkbenchIssues } from 'components/workbenches/workbench/WorkbenchIssues'
import { WorkbenchJobs } from 'components/workbenches/workbench/WorkbenchJobs'
import { WorkbenchCreateOrEdit } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import { CronSchedules } from 'components/workbenches/workbench/crons/CronSchedules'
import { SavedPrompts } from 'components/workbenches/workbench/prompts/SavedPrompts'
import { SavedPromptForm } from 'components/workbenches/workbench/prompts/SavedPromptForm'
import { WebhookTriggers } from 'components/workbenches/workbench/webhooks/WebhookTriggers'
import { WebhookForm } from 'components/workbenches/workbench/webhooks/WebhookForm'
import { CronScheduleForm } from 'components/workbenches/workbench/crons/CronScheduleForm'
import { WebhookTriggerForm } from 'components/workbenches/workbench/webhooks/WebhookTriggerForm'
import { Route } from 'react-router-dom'
import {
  WORKBENCH_JOB_ABS_PATH,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_CREATE_REL_PATH,
  WORKBENCHES_EDIT_REL_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
  WORKBENCHES_TOOLS_ADD_ABS_PATH,
  WORKBENCHES_TOOLS_ADD_REL_PATH,
  WORKBENCHES_TOOLS_EDIT_ABS_PATH,
  WORKBENCHES_TOOLS_YOUR_REL_PATH,
  WORKBENCHES_CRON_PARAM_ID,
  WORKBENCHES_CRON_SCHEDULES_REL_PATH,
  WORKBENCHES_SAVED_PROMPTS_REL_PATH,
  WORKBENCHES_SAVED_PROMPT_PARAM_ID,
  WORKBENCHES_WEBHOOK_PARAM_ID,
  WORKBENCHES_WEBHOOK_TRIGGERS_CREATE_WEBHOOK_REL_PATH,
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
      path={WORKBENCHES_TOOLS_ADD_REL_PATH}
      element={<WorkbenchToolsAdd />}
    />
    <Route
      path={WORKBENCHES_TOOLS_YOUR_REL_PATH}
      element={<ConfiguredTools />}
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
    path={`${WORKBENCHES_TOOLS_ADD_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<WorkbenchToolCreateOrEdit mode="create" />}
  />,
  <Route
    path={WORKBENCHES_TOOLS_EDIT_ABS_PATH}
    element={<WorkbenchToolCreateOrEdit mode="edit" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}`}
    element={<Workbench />}
  >
    <Route
      index
      element={<WorkbenchJobs />}
    />
    <Route
      path={WORKBENCHES_ISSUES_REL_PATH}
      element={<WorkbenchIssues />}
    />
    <Route
      path={WORKBENCHES_ALERTS_REL_PATH}
      element={<WorkbenchAlerts />}
    />
  </Route>,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`}
    element={<WorkbenchCreateOrEdit mode="edit" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}`}
    element={<CronSchedules />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<CronScheduleForm mode="create" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_SAVED_PROMPTS_REL_PATH}`}
    element={<SavedPrompts />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_SAVED_PROMPTS_REL_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<SavedPromptForm mode="create" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_SAVED_PROMPTS_REL_PATH}/:${WORKBENCHES_SAVED_PROMPT_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`}
    element={<SavedPromptForm mode="edit" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_CRON_SCHEDULES_REL_PATH}/:${WORKBENCHES_CRON_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`}
    element={<CronScheduleForm mode="edit" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}`}
    element={<WebhookTriggers />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}/${WORKBENCHES_CREATE_REL_PATH}`}
    element={<WebhookTriggerForm mode="create" />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}/${WORKBENCHES_WEBHOOK_TRIGGERS_CREATE_WEBHOOK_REL_PATH}`}
    element={<WebhookForm />}
  />,
  <Route
    path={`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/${WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}/:${WORKBENCHES_WEBHOOK_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`}
    element={<WebhookTriggerForm mode="edit" />}
  />,
  <Route
    path={WORKBENCH_JOB_ABS_PATH}
    element={<WorkbenchJob />}
  />,
]
