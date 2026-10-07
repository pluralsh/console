import {
  allSelected,
  DisplayView,
  filterVariable,
} from 'components/utils/display/DisplayPanel'
import { ALERT_SEVERITY_ORDER } from 'components/utils/alerts/AlertSeverityIcon'
import {
  AlertSeverity,
  AlertSort,
  ObservabilityWebhookType,
  SortDirection,
} from 'generated/graphql'
import { intersection, isEmpty, xor } from 'lodash'

export type WorkbenchAlertsDisplayState = {
  view: DisplayView
  types: ObservabilityWebhookType[]
  severities: AlertSeverity[]
  sort: AlertSort
  direction: SortDirection
}

export const ALL_ALERT_TYPES = Object.values(ObservabilityWebhookType)

export const DEFAULT_WORKBENCH_ALERTS_DISPLAY: WorkbenchAlertsDisplayState = {
  view: 'list',
  types: ALL_ALERT_TYPES,
  severities: ALERT_SEVERITY_ORDER,
  sort: AlertSort.UpdatedAt,
  direction: SortDirection.Desc,
}

// only sources that sent this workbench alerts are worth offering
export function visibleAlertTypes(
  counts: Partial<Record<ObservabilityWebhookType, number>>
): ObservabilityWebhookType[] {
  return ALL_ALERT_TYPES.filter((type) => (counts[type] ?? 0) > 0)
}

export function allAlertSeveritiesSelected(
  severities: AlertSeverity[]
): boolean {
  return allSelected(severities, ALERT_SEVERITY_ORDER)
}

export function hasUncheckedAlertFilters({
  types,
  severities,
}: Pick<WorkbenchAlertsDisplayState, 'types' | 'severities'>): boolean {
  return (
    !allSelected(types, ALL_ALERT_TYPES) ||
    !allAlertSeveritiesSelected(severities)
  )
}

type AlertFilterEmptyKind = 'sources' | 'severities'

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

  return isEmpty(next) ? ALERT_SEVERITY_ORDER : next
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
    types: filterVariable(types, ALL_ALERT_TYPES),
    severities: filterVariable(severities, ALERT_SEVERITY_ORDER),
    // always sent, so the sort direction applies to the default order too
    sort,
    direction,
  }
}
