import {
  AlertSeverity,
  AlertSort,
  ObservabilityWebhookType,
  SortDirection,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  ALERT_SEVERITY_OPTIONS,
  ALL_ALERT_TYPES,
  DEFAULT_WORKBENCH_ALERTS_DISPLAY,
  getAlertFilterEmptyKind,
  hasUncheckedAlertFilters,
  resetAlertFilters,
  toAlertFilterVariables,
  toggleAlertSeverityChip,
  visibleAlertTypes,
} from './workbenchAlertsDisplay'

describe('workbenchAlertsDisplay', () => {
  it('offers every API source and severity', () => {
    expect([...ALL_ALERT_TYPES].sort()).toEqual(
      Object.values(ObservabilityWebhookType).sort()
    )
    expect([...ALERT_SEVERITY_OPTIONS].sort()).toEqual(
      Object.values(AlertSeverity).sort()
    )
  })

  it('always sends the sort, and filters only when narrowed', () => {
    expect(toAlertFilterVariables(DEFAULT_WORKBENCH_ALERTS_DISPLAY)).toEqual({
      types: undefined,
      severities: undefined,
      sort: AlertSort.InsertedAt,
      direction: SortDirection.Desc,
    })
    expect(hasUncheckedAlertFilters(DEFAULT_WORKBENCH_ALERTS_DISPLAY)).toBe(
      false
    )

    const state = {
      ...DEFAULT_WORKBENCH_ALERTS_DISPLAY,
      types: [ObservabilityWebhookType.Datadog],
      severities: [AlertSeverity.High],
      sort: AlertSort.Title,
      direction: SortDirection.Asc,
    }

    expect(toAlertFilterVariables(state)).toEqual({
      types: [ObservabilityWebhookType.Datadog],
      severities: [AlertSeverity.High],
      sort: AlertSort.Title,
      direction: SortDirection.Asc,
    })
    expect(hasUncheckedAlertFilters(state)).toBe(true)
    expect(resetAlertFilters(state)).toEqual({
      ...state,
      types: DEFAULT_WORKBENCH_ALERTS_DISPLAY.types,
      severities: DEFAULT_WORKBENCH_ALERTS_DISPLAY.severities,
    })
  })

  it('only shows sources with alerts and reports empty filter groups', () => {
    const visible = visibleAlertTypes({
      [ObservabilityWebhookType.Grafana]: 2,
      [ObservabilityWebhookType.Sentry]: 0,
    })

    expect(visible).toEqual([ObservabilityWebhookType.Grafana])
    expect(
      getAlertFilterEmptyKind(
        {
          types: [ObservabilityWebhookType.Datadog],
          severities: ALERT_SEVERITY_OPTIONS,
        },
        visible
      )
    ).toBe('sources')
    expect(
      getAlertFilterEmptyKind(
        { types: ALL_ALERT_TYPES, severities: [] },
        visible
      )
    ).toBe('severities')
    expect(
      getAlertFilterEmptyKind(DEFAULT_WORKBENCH_ALERTS_DISPLAY, visible)
    ).toBeNull()
  })

  it('toggles severity chips as a quick filter', () => {
    const high = toggleAlertSeverityChip(
      ALERT_SEVERITY_OPTIONS,
      AlertSeverity.High
    )

    expect(high).toEqual([AlertSeverity.High])
    expect(toggleAlertSeverityChip(high, AlertSeverity.Low)).toEqual([
      AlertSeverity.High,
      AlertSeverity.Low,
    ])
    expect(toggleAlertSeverityChip(high, AlertSeverity.High)).toEqual(
      ALERT_SEVERITY_OPTIONS
    )
  })
})
