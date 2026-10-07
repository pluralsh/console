import { DisplayView } from 'components/utils/display/DisplayPanel'
import { ALERT_SEVERITY_ORDER } from 'components/utils/alerts/AlertSeverityIcon'
import {
  AlertSeverity,
  AlertSort,
  ObservabilityWebhookType,
  SortDirection,
} from 'generated/graphql'
import { intersection, isEmpty, xor } from 'lodash'

export type WorkbenchAlertsView = DisplayView

export const WORKBENCH_ALERTS_VIEWS: WorkbenchAlertsView[] = [
  'list',
  'board',
  'details',
]

export type WorkbenchAlertsDisplayState = {
  view: WorkbenchAlertsView
  types: ObservabilityWebhookType[]
  severities: AlertSeverity[]
  sort: AlertSort
  direction: SortDirection
}

// a Record so a new API source fails type checking until it's labelled here
export const ALERT_TYPE_LABELS: Record<ObservabilityWebhookType, string> = {
  [ObservabilityWebhookType.Grafana]: 'Grafana',
  [ObservabilityWebhookType.Datadog]: 'Datadog',
  [ObservabilityWebhookType.Pagerduty]: 'PagerDuty',
  [ObservabilityWebhookType.Newrelic]: 'New Relic',
  [ObservabilityWebhookType.Sentry]: 'Sentry',
  [ObservabilityWebhookType.Plural]: 'Plural',
  [ObservabilityWebhookType.Alertops]: 'AlertOps',
}

export const ALL_ALERT_TYPES = Object.keys(
  ALERT_TYPE_LABELS
) as ObservabilityWebhookType[]

export const ALERT_SEVERITY_OPTIONS: AlertSeverity[] = ALERT_SEVERITY_ORDER

export const DEFAULT_WORKBENCH_ALERTS_DISPLAY: WorkbenchAlertsDisplayState = {
  view: 'list',
  types: ALL_ALERT_TYPES,
  severities: ALERT_SEVERITY_OPTIONS,
  sort: AlertSort.UpdatedAt,
  direction: SortDirection.Desc,
}

// only sources that sent this workbench alerts are worth offering
export function visibleAlertTypes(
  counts: Partial<Record<ObservabilityWebhookType, number>>
): ObservabilityWebhookType[] {
  return ALL_ALERT_TYPES.filter((type) => (counts[type] ?? 0) > 0)
}

export function allAlertTypesSelected(
  types: ObservabilityWebhookType[]
): boolean {
  return isEmpty(xor(types, ALL_ALERT_TYPES))
}

export function allAlertSeveritiesSelected(
  severities: AlertSeverity[]
): boolean {
  return isEmpty(xor(severities, ALERT_SEVERITY_OPTIONS))
}

export function hasUncheckedAlertFilters({
  types,
  severities,
}: Pick<WorkbenchAlertsDisplayState, 'types' | 'severities'>): boolean {
  return (
    !allAlertTypesSelected(types) || !allAlertSeveritiesSelected(severities)
  )
}

export type AlertFilterEmptyKind = 'sources' | 'severities'

export function getAlertFilterEmptyKind(
  {
    types,
    severities,
  }: Pick<WorkbenchAlertsDisplayState, 'types' | 'severities'>,
  visibleTypes: ObservabilityWebhookType[]
): AlertFilterEmptyKind | null {
  if (!isEmpty(visibleTypes) && isEmpty(intersection(visibleTypes, types)))
    return 'sources'
  if (isEmpty(severities)) return 'severities'
  return null
}

export function resetAlertFilters(
  state: WorkbenchAlertsDisplayState
): WorkbenchAlertsDisplayState {
  return {
    ...state,
    types: DEFAULT_WORKBENCH_ALERTS_DISPLAY.types,
    severities: DEFAULT_WORKBENCH_ALERTS_DISPLAY.severities,
  }
}

// the Details severity chips are a quick filter over the same severities:
// with every severity selected a chip narrows to just itself, and
// unselecting the last chip goes back to all
export function toggleAlertSeverityChip(
  severities: AlertSeverity[],
  severity: AlertSeverity
): AlertSeverity[] {
  if (allAlertSeveritiesSelected(severities)) return [severity]
  const next = xor(severities, [severity])

  return isEmpty(next) ? ALERT_SEVERITY_OPTIONS : next
}

export function toAlertFilterVariables({
  types,
  severities,
  sort,
  direction,
}: WorkbenchAlertsDisplayState): {
  types?: ObservabilityWebhookType[]
  severities?: AlertSeverity[]
  sort: AlertSort
  direction: SortDirection
} {
  return {
    types: allAlertTypesSelected(types) ? undefined : types,
    severities: allAlertSeveritiesSelected(severities) ? undefined : severities,
    // always sent, so the sort direction applies to the default order too
    sort,
    direction,
  }
}
