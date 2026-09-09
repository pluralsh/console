import { Radio } from '@pluralsh/design-system'
import {
  DisplayFilterRow,
  DisplayFilterRows,
  DisplayPanel,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySectionHeader,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from 'components/workbenches/common/issueStatus'
import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { includes, startCase } from 'lodash'
import {
  toggleListValue,
  visibleIssueProviders,
  WorkbenchIssuesDisplayState,
} from './workbenchIssuesDisplay'

export function WorkbenchIssuesDisplayPanel({
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
  const providers = visibleIssueProviders(providerCounts)

  return (
    <DisplayPanel>
      <DisplayViewToggle
        view={state.view}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplaySection>
        <DisplaySectionHeader>Source from</DisplaySectionHeader>
        <DisplayFilterRows>
          {providers.map((provider) => (
            <DisplayFilterRow
              key={provider}
              label={startCase(provider.toLowerCase())}
              count={providerCounts[provider] ?? 0}
              checked={includes(state.providers, provider)}
              onChange={() =>
                onChange({
                  ...state,
                  providers: toggleListValue(state.providers, provider),
                })
              }
            />
          ))}
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySectionHeader>Ticket status</DisplaySectionHeader>
        <DisplayFilterRows compact>
          {ISSUE_STATUS_OPTIONS.map((status) => (
            <DisplayFilterRow
              key={status}
              label={ISSUE_STATUS_LABELS[status]}
              count={statusCounts[status] ?? 0}
              checked={includes(state.statuses, status)}
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
        <DisplaySortHeader
          descending={state.direction === IssueSortDirection.Desc}
          onToggle={() =>
            onChange({
              ...state,
              direction:
                state.direction === IssueSortDirection.Desc
                  ? IssueSortDirection.Asc
                  : IssueSortDirection.Desc,
            })
          }
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
    </DisplayPanel>
  )
}
