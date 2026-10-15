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
  ALERT_SEVERITY_LABELS,
  ALERT_SEVERITY_ORDER,
} from 'components/utils/alerts/AlertSeverityIcon'
import {
  AlertSeverity,
  AlertSort,
  ObservabilityWebhookType,
} from 'generated/graphql'
import { humanizeObservabilityWebhookType } from 'utils/webhookLabels'
import {
  visibleAlertTypes,
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
  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={ALL_DISPLAY_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplayFilterSection
        title="Source from"
        options={visibleAlertTypes(typeCounts)}
        selected={state.types}
        counts={typeCounts}
        getLabel={humanizeObservabilityWebhookType}
        onChange={(types) => onChange({ ...state, types })}
      />
      <DisplayFilterSection
        title="Severity"
        options={ALERT_SEVERITY_ORDER}
        selected={state.severities}
        counts={severityCounts}
        getLabel={(severity) => ALERT_SEVERITY_LABELS[severity]}
        compact
        onChange={(severities) => onChange({ ...state, severities })}
      />
      <DisplaySection>
        <DisplaySortHeader
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
        />
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as AlertSort })}
        >
          <Radio
            small
            value={AlertSort.UpdatedAt}
          >
            Last updated
          </Radio>
          <Radio
            small
            value={AlertSort.Title}
          >
            Title
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </>
  )
}
