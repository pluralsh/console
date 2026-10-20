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
  dashboardLegendMode,
  dashboardPanelVisibleData,
  rowCollapseWidth,
} from './WorkbenchDashboardPanels'

describe('row collapse width', () => {
  const panels = (...widths: number[]) =>
    widths.map((w, i) => ({
      identifier: `p${i}`,
      type: DashboardGraphType.Timeseries,
      hasDatasource: true,
      layout: { x: 0, y: 0, w, h: 1 },
    }))

  it('keeps the base breakpoint for wide panels', () => {
    expect(rowCollapseWidth(2, panels(1, 1))).toBe(640)
    expect(rowCollapseWidth(3, panels(3))).toBe(640)
  })

  it('collapses earlier when the narrowest panel would get too small', () => {
    expect(rowCollapseWidth(3, panels(1, 1, 1))).toBe(840)
    expect(rowCollapseWidth(4, panels(1, 3))).toBe(1120)
  })
})

describe('dashboard legend mode', () => {
  const many = Array.from(
    { length: 12 },
    (_, i) => `entrypoint=operation_${i}, operation_type=query`
  )

  it('hides the legend on narrow grid panels', () => {
    expect(dashboardLegendMode(320, false, ['metric'])).toBe('none')
  })

  it('uses a single row on regular grid panels, including before measuring', () => {
    expect(dashboardLegendMode(0, false, many)).toBe('row')
    expect(dashboardLegendMode(500, false, many)).toBe('row')
  })

  it('keeps a legend that fits on one line under the plot, even when wide', () => {
    expect(dashboardLegendMode(1200, false, ['metric'])).toBe('row')
    expect(dashboardLegendMode(1200, true, ['metric'])).toBe('row')
  })

  it('lists overflowing series beside wide panels', () => {
    expect(dashboardLegendMode(1200, false, many)).toBe('side')
    expect(dashboardLegendMode(1200, true, many)).toBe('side')
  })

  it('wraps an overflowing legend in a narrow fullscreen view', () => {
    expect(dashboardLegendMode(600, true, many)).toBe('wrap')
  })
})

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
