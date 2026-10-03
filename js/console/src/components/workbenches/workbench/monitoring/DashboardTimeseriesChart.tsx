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
import { formatUnitValue, xAxisOverhang, yAxisWidth } from './dashboardUnits'

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
  const margin = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const { value } of metrics) {
      if (typeof value !== 'number') continue
      if (value < min) min = value
      if (value > max) max = value
    }
    return {
      ...METRICS_CHART_MARGIN,
      left: yAxisWidth(min, max, unit),
      right: xAxisOverhang(xFormat.labelChars),
    }
  }, [metrics, unit, xFormat.labelChars])

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
          axisBottom: { format: xFormat.format, tickValues: 5 },
          axisLeft: {
            tickValues: 5,
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
