export const WORKBENCHES_ABS_PATH = '/workbenches'

export const WORKBENCHES_TOOLS_REL_PATH = 'tools'

export const WORKBENCH_PARAM_ID = 'workbenchId'
export const WORKBENCH_ABS_PATH = `${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}`

export const getWorkbenchAbsPath = (workbenchId: Nullable<string>) =>
  `${WORKBENCHES_ABS_PATH}/${workbenchId ?? ''}`
