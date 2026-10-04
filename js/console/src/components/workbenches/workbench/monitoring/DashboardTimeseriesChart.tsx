import { seriesExtent } from 'components/utils/axisTicks'
import {
  ChartRangeSelect,
  timeAxisFormat,
} from 'components/utils/timerange/ChartRangeSelect'
import type { TimeWindow } from 'components/utils/timerange/timeRange'
import {
  DashboardGraphUnit,
  WorkbenchJobActivityMetricFragment,
} from 'generated/graphql'
import { type ComponentProps, useMemo } from 'react'
import {
  JobActivityMetricsChart,
  METRICS_CHART_MARGIN,
} from '../job/WorkbenchJobActivityResults'
import {
  formatUnitValue,
  unitAxis,
  xAxisOverhang,
  yAxisLabelsWidth,
} from './dashboardUnits'

/** Metrics chart pinned to the dashboard window, with drag-to-zoom. */
export function DashboardTimeseriesChart({
  metrics,
  timeWindow,
  unit,
  onRangeSelect,
  lineProps,
  ...props
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
  timeWindow: TimeWindow
  unit?: Nullable<DashboardGraphUnit>
  onRangeSelect?: (start: Date, end: Date) => void
} & ComponentProps<typeof JobActivityMetricsChart>) {
  const xFormat = timeAxisFormat(timeWindow)
  const yAxis = useMemo(() => {
    const { min, max } = seriesExtent(metrics.map(({ value }) => value))
    return unitAxis(min, max, unit)
  }, [metrics, unit])
  const margin = useMemo(
    () => ({
      ...METRICS_CHART_MARGIN,
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
        metrics={metrics}
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
}
