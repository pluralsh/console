import {
  DashboardDatasourceType,
  DashboardGraphType,
  WorkbenchDashboardDetailsFragment,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { toPanelGraph } from './DashboardGraphSource'
import {
  dashboardGraphNeedsFetch,
  dashboardPanelIsWaitingForData,
  dashboardPanelVisibleData,
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

  it('keeps previous data across live ticks', () => {
    expect(
      dashboardPanelVisibleData({
        currentData: undefined,
        previousData: 'old',
        rangeRevision: 1,
        dataRevision: 1,
      })
    ).toBe('old')
  })

  it('drops previous data after a manual range change until new data lands', () => {
    expect(
      dashboardPanelVisibleData({
        currentData: undefined,
        previousData: 'old',
        rangeRevision: 2,
        dataRevision: 1,
      })
    ).toBeUndefined()
    expect(
      dashboardPanelVisibleData({
        currentData: 'new',
        previousData: 'old',
        rangeRevision: 2,
        dataRevision: 1,
      })
    ).toBe('new')
  })
})

describe('dashboard panel graph source', () => {
  const graph: NonNullable<
    NonNullable<WorkbenchDashboardDetailsFragment['graphs']>[number]
  > = {
    identifier: 'cpu',
    title: 'CPU',
    type: DashboardGraphType.Timeseries,
    layout: { x: 0, y: 0, w: 1, h: 1 },
    datasource: {
      type: DashboardDatasourceType.Metrics,
      tool: 'prometheus',
      input: { query: 'up' },
    },
  }

  it('only fetches data panels with a datasource once queries are enabled', () => {
    expect(
      dashboardGraphNeedsFetch(DashboardGraphType.Markdown, true, true)
    ).toBe(false)
    expect(
      dashboardGraphNeedsFetch(DashboardGraphType.Timeseries, false, true)
    ).toBe(false)
    expect(
      dashboardGraphNeedsFetch(DashboardGraphType.Timeseries, true, true)
    ).toBe(true)
  })

  it('derives hasDatasource from the authenticated datasource', () => {
    expect(toPanelGraph({ ...graph, datasource: null }).hasDatasource).toBe(
      false
    )
    expect(toPanelGraph(graph).hasDatasource).toBe(true)
  })
})
