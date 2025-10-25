export const STACKS_ROOT_PATH = 'stacks'
export const STACKS_PARAM_STACK = 'stackId'
export const STACKS_ABS_PATH = getStacksAbsPath(`:${STACKS_PARAM_STACK}?`)

export const STACK_RUNS_REL_PATH = `runs`
export const STACK_RUNS_PARAM_RUN = 'runId'
export const STACK_RUNS_ABS_PATH = getStackRunsAbsPath(
  `:${STACKS_PARAM_STACK}?`,
  `:${STACK_RUNS_PARAM_RUN}`
)

export const STACK_PRS_REL_PATH = `prs`

export const STACK_OVERVIEW_REL_PATH = `overview`

export const STACK_STATE_REL_PATH = `state`

export const STACK_OUTPUT_REL_PATH = `output`

export const STACK_VARS_REL_PATH = `vars`

export const STACK_INSIGHTS_REL_PATH = `insights`

export const STACK_ENV_REL_PATH = `env`

export const STACK_FILES_REL_PATH = `files`

export const STACK_JOB_REL_PATH = `job`

export const STACK_RUNS_STATE_REL_PATH = 'state'
export const STACK_RUNS_PLAN_REL_PATH = 'plan'
export const STACK_RUNS_OUTPUT_REL_PATH = 'output'
export const STACK_RUNS_JOB_REL_PATH = 'job'
export const STACK_RUNS_REPOSITORY_REL_PATH = 'repository'
export const STACK_RUNS_INSIGHTS_REL_PATH = 'insights'
export const STACK_RUNS_VIOLATIONS_REL_PATH = 'violations'

export function getStacksAbsPath(stackId: string | null | undefined) {
  return `/${STACKS_ROOT_PATH}/${stackId}`
}

export function getStackRunsAbsPath(
  stackId: Nullable<string>,
  runId: Nullable<string>
): string {
  return `${getStacksAbsPath(stackId)}/${STACK_RUNS_REL_PATH}/${runId}`
}
