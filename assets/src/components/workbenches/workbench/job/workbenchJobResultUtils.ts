import {
  WorkbenchJobFragment,
  WorkbenchJobResultFragment,
} from 'generated/graphql'
import { isJobRunning } from './WorkbenchJobActivity'

export function getWorkbenchJobTodos(
  result?: Nullable<WorkbenchJobResultFragment>
) {
  return (result?.todos ?? [])
    .filter((todo): todo is NonNullable<typeof todo> => !!todo)
    .map((todo) => ({
      title: todo.name?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.title.length > 0 || todo.description.length > 0)
}

export function getWorkbenchJobResultText(job: Nullable<WorkbenchJobFragment>) {
  const conclusion = isJobRunning(job?.status)
    ? ''
    : (job?.result?.conclusion?.trim() ?? '')
  const workingTheory = job?.result?.workingTheory?.trim() ?? ''

  return conclusion || workingTheory
}

export function hasWorkbenchJobResultContent(
  job: Nullable<WorkbenchJobFragment>
) {
  return (
    !!getWorkbenchJobResultText(job) ||
    getWorkbenchJobTodos(job?.result).length > 0
  )
}
