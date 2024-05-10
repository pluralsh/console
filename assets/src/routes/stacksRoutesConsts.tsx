export const STACKS_ROOT_PATH = 'stacks'
export const STACKS_PARAM_STACK = ':stackId?'
export const STACKS_ABS_PATH = getStacksAbsPath(STACKS_PARAM_STACK)

export function getStacksAbsPath(stackId: string | null | undefined) {
  return `/${STACKS_ROOT_PATH}/${stackId}`
}
