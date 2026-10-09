import {
  ALL_DISPLAY_VIEWS,
  DisplayFilterSection,
  DisplaySection,
  DisplaySortField,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import { WorkbenchJobPrState, WorkbenchJobStatus } from 'generated/graphql'
import { startCase } from 'lodash'
import {
  JOB_PR_STATE_LABELS,
  JOB_PR_STATE_OPTIONS,
  JOB_STATUS_OPTIONS,
  WorkbenchJobsDisplayState,
} from './workbenchJobsDisplay'

export function WorkbenchJobsDisplayOptions({
  state,
  onChange,
  statusCounts,
  prStateCounts,
  searching = false,
}: {
  state: WorkbenchJobsDisplayState
  onChange: (next: WorkbenchJobsDisplayState) => void
  // search results come back by relevance, ignoring the sort
  searching?: boolean
  statusCounts: Partial<Record<WorkbenchJobStatus, number>>
  prStateCounts: Partial<Record<WorkbenchJobPrState, number>>
}) {
  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={ALL_DISPLAY_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplayFilterSection
        title="Status"
        options={JOB_STATUS_OPTIONS}
        selected={state.statuses}
        counts={statusCounts}
        getLabel={(status) => startCase(status.toLowerCase())}
        compact
        onChange={(statuses) => onChange({ ...state, statuses })}
      />
      <DisplayFilterSection
        title="Pull request"
        options={JOB_PR_STATE_OPTIONS}
        selected={state.prStates}
        counts={prStateCounts}
        getLabel={(prState) => JOB_PR_STATE_LABELS[prState]}
        compact
        onChange={(prStates) => onChange({ ...state, prStates })}
      />
      <DisplaySection>
        <DisplaySortHeader
          disabledReason={
            searching ? 'Search results are sorted by relevance' : undefined
          }
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
        />
        {/* jobs only sort by creation date */}
        <DisplaySortField>Date created</DisplaySortField>
      </DisplaySection>
    </>
  )
}
