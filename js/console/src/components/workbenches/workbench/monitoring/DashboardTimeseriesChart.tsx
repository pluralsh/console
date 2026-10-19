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
import { DashboardGraphUnit } from 'generated/graphql'
import { type ComponentProps, memo, useMemo } from 'react'
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
  const xFormat = timeAxisFormat(timeWindow)
  const yAxis = useMemo(() => {
    const { min, max } = seriesExtent(seriesValues(series))
    return unitAxis(min, max, unit)
  }, [series, unit])
  const margin = useMemo(
    () => ({
      ...METRICS_CHART_MARGIN,
      bottom: X_AXIS_HEIGHT_PX,
      left: yAxisLabelsWidth(
        yAxis.ticks.map((tick) => formatUnitValue(tick, unit))
      ),
      right: xAxisOverhang(xFormat.labelChars),
    }),
    [yAxis, unit, xFormat.labelChars]
  )

  return (
    <ChartRangeSelect
      timeWindow={timeWindow}
      margin={margin}
      onRangeSelect={onRangeSelect}
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
          gridYValues: yAxis.ticks,
          axisBottom: { format: xFormat.format, tickValues: 5 },
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
  )
})
