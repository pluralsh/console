import { DashboardGraphType } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import {
  dashboardGraphNeedsFetch,
  dashboardPanelIsWaitingForData,
} from './WorkbenchDashboardPanels'

describe('dashboard panel loading', () => {
  it('renders a loading panel without fetching until inputs are ready', () => {
    expect(
      dashboardGraphNeedsFetch(DashboardGraphType.Timeseries, true, false)
    ).toBe(false)
    expect(
      dashboardPanelIsWaitingForData({
        queriesEnabled: false,
        loading: false,
        hasData: false,
      })
    ).toBe(true)
  })

  it('starts graph queries once inputs are ready', () => {
    expect(
      dashboardGraphNeedsFetch(DashboardGraphType.Timeseries, true, true)
    ).toBe(true)
  })

  it('keeps existing graph data visible during a refresh', () => {
    expect(
      dashboardPanelIsWaitingForData({
        queriesEnabled: true,
        loading: true,
        hasData: true,
      })
    ).toBe(false)
  })
})
