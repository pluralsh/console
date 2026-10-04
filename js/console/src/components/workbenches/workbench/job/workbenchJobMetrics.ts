import { WorkbenchJobActivityMetricFragment } from 'generated/graphql'
import { groupBy, isNil, uniq } from 'lodash'
import { toDateOrUndef } from 'utils/datetime'

export type MetricSeries = {
  data: { x: Date; y: number }[]
  id: string
  label: string
  /** Label reduced to the tags that distinguish this series from the others. */
  shortLabel: string
}

const SHORT_LABEL_MAX_TAGS = 3
const SHORT_LABEL_MAX_VALUE_LENGTH = 32
const TRUNCATION_MARKER = '…'

export function getMetricSeries(
  metrics: WorkbenchJobActivityMetricFragment[]
): MetricSeries[] {
  const grouped = Object.entries(groupBy(metrics, metricSeriesId))
  const shortLabels = metricSeriesShortLabels(
    grouped.map(([, points]) => points[0])
  )

  return grouped.map(([id, points], i) => ({
    id,
    label: metricSeriesLabel(points[0]),
    shortLabel: shortLabels[i],
    data: points
      .map((point) => ({ x: toDateOrUndef(point.timestamp), y: point.value }))
      .filter(
        (point): point is { x: Date; y: number } =>
          !isNil(point.x) && !isNil(point.y)
      ),
  }))
}

export function metricSeriesId({
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

/**
 * Drops tags shared by every series, then keeps the most distinguishing
 * remaining tags (highest cardinality first) up to SHORT_LABEL_MAX_TAGS.
 */
function metricSeriesShortLabels(
  metrics: WorkbenchJobActivityMetricFragment[]
): string[] {
  const tagMaps = metrics.map(
    ({ labels }) => new Map(metricLabelEntries(labels).map(stringifyEntry))
  )
  const keys = uniq(tagMaps.flatMap((tags) => [...tags.keys()]))
  const cardinality = new Map(
    keys.map((key) => [key, uniq(tagMaps.map((tags) => tags.get(key))).length])
  )
  const varyingKeys = keys
    .filter((key) => (cardinality.get(key) ?? 0) > 1)
    .sort(
      (left, right) =>
        (cardinality.get(right) ?? 0) - (cardinality.get(left) ?? 0) ||
        left.localeCompare(right)
    )
  const namesVary = uniq(metrics.map(({ name }) => name)).length > 1

  return metrics.map(({ name }, i) => {
    const tags = tagMaps[i]
    const distinct = varyingKeys.filter((key) => tags.has(key))
    const candidates = distinct.length > 0 ? distinct : [...tags.keys()]
    const shown = candidates
      .slice(0, SHORT_LABEL_MAX_TAGS)
      .map((key) => `${key}=${truncateValue(tags.get(key) ?? '')}`)

    if (candidates.length > SHORT_LABEL_MAX_TAGS) shown.push(TRUNCATION_MARKER)
    if ((namesVary || shown.length === 0) && name) shown.unshift(name)

    return shown.join(', ') || 'metric'
  })
}

function truncateValue(value: string) {
  return value.length > SHORT_LABEL_MAX_VALUE_LENGTH
    ? `${value.slice(0, SHORT_LABEL_MAX_VALUE_LENGTH - 1)}${TRUNCATION_MARKER}`
    : value
}

function stringifyEntry([key, value]: [string, unknown]): [string, string] {
  return [key, typeof value === 'string' ? value : JSON.stringify(value)]
}

function metricLabelEntries(labels: Nullable<Record<string, unknown>>) {
  return Object.entries(labels ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  )
}
