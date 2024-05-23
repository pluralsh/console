export const STACKS_ABS_PATH = 'stacks'

export const STACK_PARAM_STACK_ID = ':stackId'
export const STACK_ABS_PATH = `stacks/${STACK_PARAM_STACK_ID}`

export const STACK_RUNS_REL_PATH = `runs`
export const STACK_RUNS_PARAM_RUN = ':runId'
export const STACK_RUNS_ABS_PATH = getStackRunsAbsPath(
  STACK_PARAM_STACK_ID,
  STACK_RUNS_PARAM_RUN
)

export const STACK_CONFIG_REL_PATH = `config`

export const STACK_REPO_REL_PATH = `repo`

export const STACK_ENV_REL_PATH = `env`

export const STACK_JOB_REL_PATH = `job`

export const STACK_RUNS_STATE_REL_PATH = 'state'
export const STACK_RUNS_PLAN_REL_PATH = 'plan'
export const STACK_RUNS_OUTPUT_REL_PATH = 'output'
export const STACK_RUNS_REPOSITORY_REL_PATH = 'repository'

export function getStacksAbsPath(stackId: string | null | undefined) {
  return `/${STACKS_ABS_PATH}/${stackId}`
}

export function getStackRunsAbsPath(
  stackId: Nullable<string>,
  runId: Nullable<string>
): string {
  return `${getStacksAbsPath(stackId)}/${STACK_RUNS_REL_PATH}/${runId}`
}
