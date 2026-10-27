import {
  allSelected,
  DisplayView,
  filterVariable,
} from 'components/utils/display/DisplayPanel'
import {
  SortDirection,
  WorkbenchJobPrState,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { isEmpty } from 'lodash'

export type WorkbenchJobsDisplayState = {
  view: DisplayView
  statuses: WorkbenchJobStatus[]
  prStates: WorkbenchJobPrState[]
  userIds: string[]
  direction: SortDirection
}

// every API status, in lifecycle (key) order; a Record so a new API status
// fails type checking until it's placed here
const JOB_STATUS_ORDER: Record<WorkbenchJobStatus, true> = {
  [WorkbenchJobStatus.Pending]: true,
  [WorkbenchJobStatus.Running]: true,
  [WorkbenchJobStatus.Paused]: true,
  [WorkbenchJobStatus.Successful]: true,
  [WorkbenchJobStatus.Failed]: true,
  [WorkbenchJobStatus.Cancelled]: true,
}

export const JOB_STATUS_OPTIONS = Object.keys(
  JOB_STATUS_ORDER
) as WorkbenchJobStatus[]

export const JOB_PR_STATE_LABELS: Record<WorkbenchJobPrState, string> = {
  [WorkbenchJobPrState.Open]: 'Open',
  [WorkbenchJobPrState.Merged]: 'Merged',
  [WorkbenchJobPrState.Closed]: 'Closed',
  [WorkbenchJobPrState.None]: 'No PR',
}

// label order: every API PR state, with "No PR" last
export const JOB_PR_STATE_OPTIONS = Object.keys(
  JOB_PR_STATE_LABELS
) as WorkbenchJobPrState[]

export const WORKBENCH_JOBS_PAGE_SIZE = 50

export type WorkbenchJobPerson = {
  id: string
  name?: string | null
  count: number
}

// Distinct people on jobs this page has already loaded. Someone whose job
// has not loaded is omitted, and each count is that person's loaded jobs.
export function peopleFromLoadedJobs(
  jobs: readonly {
    id: string
    user?: { id: string; name?: string | null } | null
  }[]
): WorkbenchJobPerson[] {
  const seen = new Set<string>()
  const byUser = new Map<string, WorkbenchJobPerson>()

  for (const job of jobs) {
    if (seen.has(job.id)) continue
    seen.add(job.id)
    const user = job.user
    if (!user) continue

    const existing = byUser.get(user.id)
    if (existing) existing.count += 1
    else byUser.set(user.id, { id: user.id, name: user.name, count: 1 })
  }

  return [...byUser.values()].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '')
  )
}

export const DEFAULT_WORKBENCH_JOBS_DISPLAY: WorkbenchJobsDisplayState = {
  view: 'list',
  statuses: JOB_STATUS_OPTIONS,
  prStates: JOB_PR_STATE_OPTIONS,
  userIds: [],
  direction: SortDirection.Desc,
}

export function hasUncheckedJobFilters({
  statuses,
  prStates,
  userIds,
}: Pick<
  WorkbenchJobsDisplayState,
  'statuses' | 'prStates' | 'userIds'
>): boolean {
  return (
    !allSelected(statuses, JOB_STATUS_OPTIONS) ||
    !allSelected(prStates, JOB_PR_STATE_OPTIONS) ||
    !isEmpty(userIds)
  )
}

type JobFilterEmptyKind = 'statuses' | 'pull request states'

export function getJobFilterEmptyKind({
  statuses,
  prStates,
}: Pick<
  WorkbenchJobsDisplayState,
  'statuses' | 'prStates'
>): JobFilterEmptyKind | null {
  if (isEmpty(statuses)) return 'statuses'
  if (isEmpty(prStates)) return 'pull request states'
  return null
}

export function resetJobFilters(
  state: WorkbenchJobsDisplayState
): WorkbenchJobsDisplayState {
  return {
    ...state,
    statuses: DEFAULT_WORKBENCH_JOBS_DISPLAY.statuses,
    prStates: DEFAULT_WORKBENCH_JOBS_DISPLAY.prStates,
    userIds: DEFAULT_WORKBENCH_JOBS_DISPLAY.userIds,
  }
}

// filters shared by the runs list and job search
export function toJobFilterVariables({
  statuses,
  prStates,
  userIds,
}: Pick<WorkbenchJobsDisplayState, 'statuses' | 'prStates' | 'userIds'>): {
  statuses?: WorkbenchJobStatus[]
  prStates?: WorkbenchJobPrState[]
  userIds?: string[]
} {
  return {
    statuses: filterVariable(statuses, JOB_STATUS_OPTIONS),
    prStates: filterVariable(prStates, JOB_PR_STATE_OPTIONS),
    // empty means everyone, including people who run a job later; a
    // non-empty list is sent as-is rather than compared to the current options
    ...(!isEmpty(userIds) ? { userIds } : {}),
  }
}
