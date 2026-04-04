export const WORKBENCHES_ABS_PATH = '/workbenches'

export const WORKBENCHES_TOOLS_PARAM_ID = 'toolId'
export const WORKBENCH_PARAM_ID = 'workbenchId'
export const WORKBENCHES_CREATE_REL_PATH = 'create'
export const WORKBENCHES_EDIT_REL_PATH = 'edit'
export const WORKBENCHES_TRIGGERS_REL_PATH = 'triggers'
export const WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH = 'schedule'
export const WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH = 'webhook'
export const WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM = 'create'

export const WORKBENCHES_TOOLS_REL_PATH = 'tools'
export const WORKBENCHES_ALERTS_REL_PATH = 'alerts'
export const WORKBENCHES_ISSUES_REL_PATH = 'issues'
export const WORKBENCHES_TOOLS_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_TOOLS_REL_PATH}`
export const WORKBENCHES_TOOLS_CREATE_ABS_PATH = `${WORKBENCHES_TOOLS_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`
export const WORKBENCHES_TOOLS_EDIT_ABS_PATH = `${WORKBENCHES_TOOLS_ABS_PATH}/:${WORKBENCHES_TOOLS_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`

export const WORKBENCHES_CREATE_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchAbsPath = (workbenchId: Nullable<string>) =>
  `${WORKBENCHES_ABS_PATH}/${workbenchId ?? ''}`

export const getWorkbenchJobAbsPath = ({
  workbenchId,
  jobId,
}: {
  workbenchId: string
  jobId: string
}) => `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCH_JOBS_REL_PATH}/${jobId}`

export const WORKBENCH_JOBS_REL_PATH = 'jobs'
export const WORKBENCH_JOBS_PARAM_JOB = 'jobId'
export const WORKBENCH_JOB_ABS_PATH = getWorkbenchJobAbsPath({
  workbenchId: `:${WORKBENCH_PARAM_ID}`,
  jobId: `:${WORKBENCH_JOBS_PARAM_JOB}`,
})
