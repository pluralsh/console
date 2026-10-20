import {
  seriesExtent,
  xAxisOverhang,
  yAxisLabelsWidth,
} from 'components/utils/axisTicks'
import {
  ChartRangeSelect,
  timeAxisFormat,
} from 'components/utils/timerange/ChartRangeSelect'
import type { TimeWindow } from 'components/utils/timerange/timeRange'
import { niceTimeTicks } from 'components/utils/timeTicks'
import { useChartSize } from 'components/utils/useChartSize'
import { DashboardGraphUnit } from 'generated/graphql'
import { type ComponentProps, memo, useMemo } from 'react'
import styled from 'styled-components'
import {
  JobActivityMetricsChart,
  METRICS_CHART_MARGIN,
} from '../job/WorkbenchJobActivityResults'
import type { MetricSeries } from '../job/workbenchJobMetrics'
import { formatUnitValue, unitAxis } from './dashboardUnits'

// tick (5) + tick padding (5) + an 11px label line
const X_AXIS_HEIGHT_PX = 24

function* seriesValues(series: MetricSeries[]) {
  for (const { data } of series) for (const { y } of data) yield y
}

/** Metrics chart pinned to the dashboard window, with drag-to-zoom. */
export const DashboardTimeseriesChart = memo(function DashboardTimeseriesChart({
  series,
  timeWindow,
  unit,
  onRangeSelect,
  lineProps,
  ...props
}: {
  timeWindow: TimeWindow
  unit?: Nullable<DashboardGraphUnit>
  onRangeSelect?: (start: Date, end: Date) => void
} & ComponentProps<typeof JobActivityMetricsChart>) {
  const [sizeRef, { width }] = useChartSize<HTMLDivElement>()
  const yAxis = useMemo(() => {
    const { min, max } = seriesExtent(seriesValues(series))
    return unitAxis(min, max, unit)
  }, [series, unit])
  const left = useMemo(
    () =>
      yAxisLabelsWidth(yAxis.ticks.map((tick) => formatUnitValue(tick, unit))),
    [yAxis, unit]
  )
  // Ticks are spaced by measured plot width so labels never overlap; until
  // the chart is measured, fall back to the window's coarse label format.
  const xAxis = useMemo(() => {
    const fallback = timeAxisFormat(timeWindow)
    if (width === 0) return { ...fallback, ticks: 5 as const }
    const right = xAxisOverhang(fallback.labelChars)
    return niceTimeTicks(
      timeWindow.start,
      timeWindow.end,
      width - left - right,
      {
        overhangPx: { left, right },
      }
    )
  }, [timeWindow, width, left])
  const margin = useMemo(
    () => ({
      ...METRICS_CHART_MARGIN,
      bottom: X_AXIS_HEIGHT_PX,
      left,
      right: xAxisOverhang(xAxis.labelChars),
    }),
    [left, xAxis.labelChars]
  )

  return (
    <MeasureSC ref={sizeRef}>
      <ChartRangeSelect
        timeWindow={timeWindow}
        margin={margin}
        onRangeSelect={onRangeSelect}
        style={{ height: '100%' }}
      >
        <JobActivityMetricsChart
          series={series}
          lineProps={{
            xScale: {
              type: 'time',
              format: 'native',
              min: timeWindow.start,
              max: timeWindow.end,
            },
            yScale: { type: 'linear', min: yAxis.min, max: yAxis.max },
            gridXValues: xAxis.ticks,
            gridYValues: yAxis.ticks,
            axisBottom: { format: xAxis.format, tickValues: xAxis.ticks },
            axisLeft: {
              tickValues: yAxis.ticks,
              format: (value: number) => formatUnitValue(value, unit),
            },
            yFormat: (value) => formatUnitValue(Number(value), unit),
            margin,
            ...lineProps,
          }}
          {...props}
        />
      </ChartRangeSelect>
    </MeasureSC>
  )
})

const MeasureSC = styled.div({
  height: '100%',
  minWidth: 0,
  position: 'relative',
  width: '100%',
})
