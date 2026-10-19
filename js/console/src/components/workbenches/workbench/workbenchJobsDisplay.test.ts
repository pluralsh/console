import { WorkbenchJobPrState, WorkbenchJobStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKBENCH_JOBS_DISPLAY,
  getJobFilterEmptyKind,
  hasUncheckedJobFilters,
  JOB_PR_STATE_OPTIONS,
  JOB_STATUS_OPTIONS,
  resetJobFilters,
  toJobFilterVariables,
} from './workbenchJobsDisplay'

describe('workbenchJobsDisplay', () => {
  it('defaults to the board view', () => {
    expect(DEFAULT_WORKBENCH_JOBS_DISPLAY.view).toBe('board')
  })

  it('sends no filters when everything is selected', () => {
    expect(toJobFilterVariables(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toEqual({
      statuses: undefined,
      prStates: undefined,
    })
    expect(hasUncheckedJobFilters(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toBe(false)
  })

  it('sends the selected statuses and pull request states', () => {
    const state = {
      ...DEFAULT_WORKBENCH_JOBS_DISPLAY,
      statuses: [WorkbenchJobStatus.Failed],
      prStates: [WorkbenchJobPrState.Merged, WorkbenchJobPrState.None],
    }

    expect(toJobFilterVariables(state)).toEqual({
      statuses: [WorkbenchJobStatus.Failed],
      prStates: [WorkbenchJobPrState.Merged, WorkbenchJobPrState.None],
    })
    expect(hasUncheckedJobFilters(state)).toBe(true)
    expect(resetJobFilters(state)).toEqual(DEFAULT_WORKBENCH_JOBS_DISPLAY)
  })

  it('reports which filter group is empty', () => {
    expect(getJobFilterEmptyKind(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toBeNull()
    expect(
      getJobFilterEmptyKind({ ...DEFAULT_WORKBENCH_JOBS_DISPLAY, statuses: [] })
    ).toBe('statuses')
    expect(
      getJobFilterEmptyKind({ ...DEFAULT_WORKBENCH_JOBS_DISPLAY, prStates: [] })
    ).toBe('pull request states')
  })
})

describe('job filter options', () => {
  it('offer every API status and pull request state', () => {
    expect(JOB_STATUS_OPTIONS).toEqual([
      WorkbenchJobStatus.Pending,
      WorkbenchJobStatus.Running,
      WorkbenchJobStatus.Paused,
      WorkbenchJobStatus.Successful,
      WorkbenchJobStatus.Failed,
      WorkbenchJobStatus.Cancelled,
    ])
    expect([...JOB_STATUS_OPTIONS].sort()).toEqual(
      Object.values(WorkbenchJobStatus).sort()
    )
    expect([...JOB_PR_STATE_OPTIONS].sort()).toEqual(
      Object.values(WorkbenchJobPrState).sort()
    )
  })
})
