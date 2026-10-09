import { Radio } from '@pluralsh/design-system'
import {
  ALL_DISPLAY_VIEWS,
  DisplayFilterSection,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from 'components/workbenches/common/issueStatus'
import { IssueSort, IssueStatus, IssueWebhookProvider } from 'generated/graphql'
import { humanizeIssueWebhookProvider } from 'utils/webhookLabels'
import {
  visibleIssueProviders,
  WorkbenchIssuesDisplayState,
} from './workbenchIssuesDisplay'

export function WorkbenchIssuesDisplayOptions({
  state,
  onChange,
  providerCounts,
  statusCounts,
}: {
  state: WorkbenchIssuesDisplayState
  onChange: (next: WorkbenchIssuesDisplayState) => void
  providerCounts: Partial<Record<IssueWebhookProvider, number>>
  statusCounts: Partial<Record<IssueStatus, number>>
}) {
  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={ALL_DISPLAY_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplayFilterSection
        title="Source from"
        options={visibleIssueProviders(providerCounts)}
        selected={state.providers}
        counts={providerCounts}
        getLabel={humanizeIssueWebhookProvider}
        onChange={(providers) => onChange({ ...state, providers })}
      />
      <DisplayFilterSection
        title="Issue status"
        options={ISSUE_STATUS_OPTIONS}
        selected={state.statuses}
        counts={statusCounts}
        getLabel={(status) => ISSUE_STATUS_LABELS[status]}
        compact
        onChange={(statuses) => onChange({ ...state, statuses })}
      />
      <DisplaySection>
        <DisplaySortHeader
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
        />
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as IssueSort })}
        >
          <Radio
            small
            value={IssueSort.InsertedAt}
          >
            Date created
          </Radio>
          <Radio
            small
            value={IssueSort.Title}
          >
            Issue name
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </>
  )
}
