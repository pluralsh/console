import { WorkbenchJobActivityMetricFragment } from 'generated/graphql'
import { groupBy, isNil } from 'lodash'
import { toDateOrUndef } from 'utils/datetime'

export type MetricSeries = {
  data: { x: Date; y: number }[]
  id: string
  label: string
}

export function getMetricSeries(
  metrics: WorkbenchJobActivityMetricFragment[]
): MetricSeries[] {
  const grouped = groupBy(metrics, metricSeriesId)

  return Object.entries(grouped).map(([id, points]) => ({
    id,
    label: metricSeriesLabel(points[0]),
    data: points
      .map((point) => ({ x: toDateOrUndef(point.timestamp), y: point.value }))
      .filter(
        (point): point is { x: Date; y: number } =>
          !isNil(point.x) && !isNil(point.y)
      ),
  }))
}

function metricSeriesId({
  name,
  labels,
}: WorkbenchJobActivityMetricFragment): string {
  return `${name ?? 'metric'}{${metricLabelEntries(labels)
    .map(([key, value]) => `${key}:${value}`)
    .join(',')}}`
}

function metricSeriesLabel({
  name,
  labels,
}: WorkbenchJobActivityMetricFragment): string {
  const label = metricLabelEntries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')

  return label || name || 'metric'
}

function metricLabelEntries(labels: Nullable<Record<string, unknown>>) {
  return Object.entries(labels ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  )
}
