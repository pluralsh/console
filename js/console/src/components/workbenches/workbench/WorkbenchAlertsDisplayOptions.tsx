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
  AlertSeverity,
  AlertSort,
  ObservabilityWebhookType,
  SortDirection,
} from 'generated/graphql'
import { startCase } from 'lodash'
import {
  ALERT_SEVERITY_OPTIONS,
  ALERT_TYPE_LABELS,
  visibleAlertTypes,
  WORKBENCH_ALERTS_VIEWS,
  WorkbenchAlertsDisplayState,
} from './workbenchAlertsDisplay'

export function WorkbenchAlertsDisplayOptions({
  state,
  onChange,
  typeCounts,
  severityCounts,
}: {
  state: WorkbenchAlertsDisplayState
  onChange: (next: WorkbenchAlertsDisplayState) => void
  typeCounts: Partial<Record<ObservabilityWebhookType, number>>
  severityCounts: Partial<Record<AlertSeverity, number>>
}) {
  const types = visibleAlertTypes(typeCounts)

  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={WORKBENCH_ALERTS_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplaySection>
        <DisplaySectionHeader>Source from</DisplaySectionHeader>
        <DisplayFilterRows>
          {types.map((type) => (
            <DisplayFilterRow
              key={type}
              label={ALERT_TYPE_LABELS[type]}
              count={typeCounts[type] ?? 0}
              checked={state.types.includes(type)}
              onChange={() =>
                onChange({
                  ...state,
                  types: toggleListValue(state.types, type),
                })
              }
            />
          ))}
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySectionHeader>Severity</DisplaySectionHeader>
        <DisplayFilterRows compact>
          {ALERT_SEVERITY_OPTIONS.map((severity) => (
            <DisplayFilterRow
              key={severity}
              label={startCase(severity.toLowerCase())}
              count={severityCounts[severity] ?? 0}
              checked={state.severities.includes(severity)}
              onChange={() =>
                onChange({
                  ...state,
                  severities: toggleListValue(state.severities, severity),
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
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as AlertSort })}
        >
          <Radio
            small
            value={AlertSort.InsertedAt}
          >
            Date created
          </Radio>
          <Radio
            small
            value={AlertSort.Title}
          >
            Alert name
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </>
  )
}
