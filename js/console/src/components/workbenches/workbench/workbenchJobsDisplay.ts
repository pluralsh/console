import { DisplayView } from 'components/utils/display/DisplayPanel'
import {
  SortDirection,
  WorkbenchJobPrState,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { isEmpty, sortBy, xor } from 'lodash'

export type WorkbenchJobsView = DisplayView

export const WORKBENCH_JOBS_VIEWS: WorkbenchJobsView[] = [
  'list',
  'board',
  'details',
]

export type WorkbenchJobsDisplayState = {
  view: WorkbenchJobsView
  statuses: WorkbenchJobStatus[]
  prStates: WorkbenchJobPrState[]
  direction: SortDirection
}

// every API status, in lifecycle order; a Record so a new API status fails
// type checking until it's placed here
const JOB_STATUS_ORDER: Record<WorkbenchJobStatus, number> = {
  [WorkbenchJobStatus.Pending]: 0,
  [WorkbenchJobStatus.Running]: 1,
  [WorkbenchJobStatus.Paused]: 2,
  [WorkbenchJobStatus.Successful]: 3,
  [WorkbenchJobStatus.Failed]: 4,
  [WorkbenchJobStatus.Cancelled]: 5,
}

export const JOB_STATUS_OPTIONS: WorkbenchJobStatus[] = sortBy(
  Object.values(WorkbenchJobStatus),
  (status) => JOB_STATUS_ORDER[status]
)

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

export const DEFAULT_WORKBENCH_JOBS_DISPLAY: WorkbenchJobsDisplayState = {
  view: 'list',
  statuses: JOB_STATUS_OPTIONS,
  prStates: JOB_PR_STATE_OPTIONS,
  direction: SortDirection.Desc,
}

export function allJobStatusesSelected(
  statuses: WorkbenchJobStatus[]
): boolean {
  return isEmpty(xor(statuses, JOB_STATUS_OPTIONS))
}

export function allJobPrStatesSelected(
  prStates: WorkbenchJobPrState[]
): boolean {
  return isEmpty(xor(prStates, JOB_PR_STATE_OPTIONS))
}

export function hasUncheckedJobFilters({
  statuses,
  prStates,
}: Pick<WorkbenchJobsDisplayState, 'statuses' | 'prStates'>): boolean {
  return !allJobStatusesSelected(statuses) || !allJobPrStatesSelected(prStates)
}

export type JobFilterEmptyKind = 'statuses' | 'pull request states'

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
  }
}

// filters shared by the runs list and job search
export function toJobFilterVariables({
  statuses,
  prStates,
}: Pick<WorkbenchJobsDisplayState, 'statuses' | 'prStates'>): {
  statuses?: WorkbenchJobStatus[]
  prStates?: WorkbenchJobPrState[]
} {
  return {
    statuses: allJobStatusesSelected(statuses) ? undefined : statuses,
    prStates: allJobPrStatesSelected(prStates) ? undefined : prStates,
  }
}
