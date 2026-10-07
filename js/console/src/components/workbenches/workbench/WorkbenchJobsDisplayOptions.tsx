import { Radio } from '@pluralsh/design-system'
import {
  DisplayFilterRow,
  DisplayFilterRows,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySectionHeader,
  DisplaySortHeader,
  DisplayViewToggle,
  toggleListValue,
} from 'components/utils/display/DisplayPanel'
import {
  SortDirection,
  WorkbenchJobPrState,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { startCase } from 'lodash'
import {
  JOB_PR_STATE_LABELS,
  JOB_PR_STATE_OPTIONS,
  JOB_STATUS_OPTIONS,
  WORKBENCH_JOBS_VIEWS,
  WorkbenchJobsDisplayState,
} from './workbenchJobsDisplay'

export function WorkbenchJobsDisplayOptions({
  state,
  onChange,
  statusCounts,
  prStateCounts,
}: {
  state: WorkbenchJobsDisplayState
  onChange: (next: WorkbenchJobsDisplayState) => void
  statusCounts: Partial<Record<WorkbenchJobStatus, number>>
  prStateCounts: Partial<Record<WorkbenchJobPrState, number>>
}) {
  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={WORKBENCH_JOBS_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplaySection>
        <DisplaySectionHeader>Status</DisplaySectionHeader>
        <DisplayFilterRows compact>
          {JOB_STATUS_OPTIONS.map((status) => (
            <DisplayFilterRow
              key={status}
              label={startCase(status.toLowerCase())}
              count={statusCounts[status] ?? 0}
              checked={state.statuses.includes(status)}
              onChange={() =>
                onChange({
                  ...state,
                  statuses: toggleListValue(state.statuses, status),
                })
              }
            />
          ))}
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySectionHeader>Pull request</DisplaySectionHeader>
        <DisplayFilterRows compact>
          {JOB_PR_STATE_OPTIONS.map((prState) => (
            <DisplayFilterRow
              key={prState}
              label={JOB_PR_STATE_LABELS[prState]}
              count={prStateCounts[prState] ?? 0}
              checked={state.prStates.includes(prState)}
              onChange={() =>
                onChange({
                  ...state,
                  prStates: toggleListValue(state.prStates, prState),
                })
              }
            />
          ))}
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySortHeader
          descending={state.direction === SortDirection.Desc}
          onToggle={() =>
            onChange({
              ...state,
              direction:
                state.direction === SortDirection.Desc
                  ? SortDirection.Asc
                  : SortDirection.Desc,
            })
          }
        />
        {/* jobs only sort by creation date; the radio mirrors the other tabs */}
        <DisplayRadioGroup
          value="insertedAt"
          onChange={() => {}}
        >
          <Radio
            small
            value="insertedAt"
          >
            Date created
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </>
  )
}
