export const STACKS_ROOT_PATH = 'stacks'
export const STACKS_PARAM_STACK = ':stackId?'
export const STACKS_ABS_PATH = getStacksAbsPath(STACKS_PARAM_STACK)

export const STACK_RUNS_REL_PATH = `runs`
export const STACK_RUNS_PARAM_RUN = ':runId?'
export const STACK_RUNS_ABS_PATH = getStackRunsAbsPath(
  STACKS_PARAM_STACK,
  STACK_RUNS_PARAM_RUN
)

export const STACK_RUNS_STATE_REL_PATH = 'state'
export const STACK_RUNS_PLAN_REL_PATH = 'plan'
export const STACK_RUNS_OUTPUT_REL_PATH = 'output'
export const STACK_RUNS_REPOSITORY_REL_PATH = 'repository'

export function getStacksAbsPath(stackId: string | null | undefined) {
  return `/${STACKS_ROOT_PATH}/${stackId}`
}

export function getStackRunsAbsPath(
  stackId: Nullable<string>,
  runId: Nullable<string>
): string {
  return `${getStacksAbsPath(stackId)}/${STACK_RUNS_REL_PATH}/${runId}`
}
