import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'

export const isActivityTerminal = (
  status: Nullable<WorkbenchJobActivityStatus>
) =>
  status === WorkbenchJobActivityStatus.Successful ||
  status === WorkbenchJobActivityStatus.Failed

const lastActivityId = (
  activities: WorkbenchJobActivityFragment[]
): string | null => {
  const last = activities.findLast(
    (a) => a.type !== WorkbenchJobActivityType.Memo
  )
  if (last) return last.id
  return null
}

export const defaultClosedIds = (
  activities: WorkbenchJobActivityFragment[]
): Set<string> => {
  const lastId = lastActivityId(activities)

  return new Set(
    activities
      .filter((a) => a.id !== lastId && isActivityTerminal(a.status))
      .map((a) => a.id)
  )
}
