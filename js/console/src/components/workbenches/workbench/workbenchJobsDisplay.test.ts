import { WorkbenchJobPrState, WorkbenchJobStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WORKBENCH_JOBS_DISPLAY,
  getJobFilterEmptyKind,
  hasUncheckedJobFilters,
  JOB_PR_STATE_OPTIONS,
  JOB_STATUS_OPTIONS,
  peopleFromLoadedJobs,
  resetJobFilters,
  toJobFilterVariables,
} from './workbenchJobsDisplay'

describe('workbenchJobsDisplay', () => {
  it('defaults to the list view', () => {
    expect(DEFAULT_WORKBENCH_JOBS_DISPLAY.view).toBe('list')
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

  it('sends selected people without treating an empty person list as an empty filter', () => {
    expect(toJobFilterVariables(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toEqual({
      statuses: undefined,
      prStates: undefined,
    })
    expect(hasUncheckedJobFilters(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toBe(false)
    expect(getJobFilterEmptyKind(DEFAULT_WORKBENCH_JOBS_DISPLAY)).toBeNull()

    const state = {
      ...DEFAULT_WORKBENCH_JOBS_DISPLAY,
      userIds: ['user-1', 'user-2'],
    }

    expect(toJobFilterVariables(state)).toEqual({
      statuses: undefined,
      prStates: undefined,
      userIds: ['user-1', 'user-2'],
    })
    expect(hasUncheckedJobFilters(state)).toBe(true)
    expect(getJobFilterEmptyKind(state)).toBeNull()
    expect(
      getJobFilterEmptyKind({ ...state, userIds: [] })
    ).toBeNull()
    expect(resetJobFilters(state)).toEqual(DEFAULT_WORKBENCH_JOBS_DISPLAY)
  })
})

describe('peopleFromLoadedJobs', () => {
  it('counts distinct people on the loaded jobs, ordered by name', () => {
    expect(
      peopleFromLoadedJobs([
        { id: 'job-1', user: { id: 'bob', name: 'Bob' } },
        { id: 'job-2', user: { id: 'ada', name: 'Ada' } },
        { id: 'job-3', user: { id: 'ada', name: 'Ada' } },
        { id: 'job-4', user: null },
        { id: 'job-2', user: { id: 'ada', name: 'Ada' } },
      ])
    ).toEqual([
      { id: 'ada', name: 'Ada', count: 2 },
      { id: 'bob', name: 'Bob', count: 1 },
    ])
  })

  it('is empty when no loaded job has a person', () => {
    expect(peopleFromLoadedJobs([])).toEqual([])
    expect(peopleFromLoadedJobs([{ id: 'job-1', user: null }])).toEqual([])
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
