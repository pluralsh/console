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

export const DEFAULT_WORKBENCH_JOBS_DISPLAY: WorkbenchJobsDisplayState = {
  view: 'details',
  statuses: JOB_STATUS_OPTIONS,
  prStates: JOB_PR_STATE_OPTIONS,
  direction: SortDirection.Desc,
}

export function hasUncheckedJobFilters({
  statuses,
  prStates,
}: Pick<WorkbenchJobsDisplayState, 'statuses' | 'prStates'>): boolean {
  return (
    !allSelected(statuses, JOB_STATUS_OPTIONS) ||
    !allSelected(prStates, JOB_PR_STATE_OPTIONS)
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
    statuses: filterVariable(statuses, JOB_STATUS_OPTIONS),
    prStates: filterVariable(prStates, JOB_PR_STATE_OPTIONS),
  }
}
