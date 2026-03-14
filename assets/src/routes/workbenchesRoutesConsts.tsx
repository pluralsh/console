export const WORKBENCHES_ABS_PATH = '/workbenches'

export const WORKBENCHES_TOOLS_PARAM_ID = 'toolId'
export const WORKBENCH_PARAM_ID = 'workbenchId'
export const WORKBENCHES_CREATE_REL_PATH = 'create'
export const WORKBENCHES_EDIT_REL_PATH = 'edit'

export const WORKBENCHES_TOOLS_REL_PATH = 'tools'
export const WORKBENCHES_TOOLS_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_TOOLS_REL_PATH}`
export const WORKBENCHES_TOOLS_CREATE_ABS_PATH = `${WORKBENCHES_TOOLS_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`
export const WORKBENCHES_TOOLS_EDIT_ABS_PATH = `${WORKBENCHES_TOOLS_ABS_PATH}/:${WORKBENCHES_TOOLS_PARAM_ID}/${WORKBENCHES_EDIT_REL_PATH}`

export const WORKBENCHES_CREATE_ABS_PATH = `${WORKBENCHES_ABS_PATH}/${WORKBENCHES_CREATE_REL_PATH}`

export const getWorkbenchAbsPath = (workbenchId: Nullable<string>) =>
  `${WORKBENCHES_ABS_PATH}/${workbenchId ?? ''}`

export const getWorkbenchRunAbsPath = ({
  workbenchId,
  runId,
}: {
  workbenchId: string
  runId: string
}) => `${getWorkbenchAbsPath(workbenchId)}/${WORKBENCH_RUNS_REL_PATH}/${runId}`

export const WORKBENCH_RUNS_REL_PATH = 'runs'
export const WORKBENCH_RUNS_PARAM_RUN = 'runId'
export const WORKBENCH_RUN_ABS_PATH = getWorkbenchRunAbsPath({
  workbenchId: `:${WORKBENCH_PARAM_ID}`,
  runId: `:${WORKBENCH_RUNS_PARAM_RUN}`,
})
