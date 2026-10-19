import {
  MetricSeriesFragment,
  WorkbenchJobActivityMetricFragment,
} from 'generated/graphql'
import { groupBy, isNil, uniq } from 'lodash'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export type MetricPoint = { x: Date; y: number }

export type MetricSeries = {
  data: MetricPoint[]
  id: string
  label: string
  /** Label reduced to the tags that distinguish this series from the others. */
  shortLabel: string
}

type MetricSeriesKey = {
  name?: Nullable<string>
  labels?: Nullable<Record<string, unknown>>
}

const SHORT_LABEL_MAX_TAGS = 3
const SHORT_LABEL_MAX_VALUE_LENGTH = 32
const TRUNCATION_MARKER = '…'

/** Groups flat metric points (e.g. stored thought results) into series. */
export function getMetricSeries(
  metrics: WorkbenchJobActivityMetricFragment[]
): MetricSeries[] {
  const grouped = Object.values(groupBy(metrics, metricSeriesId))

  return buildMetricSeries(
    grouped.map((points) => points[0]),
    grouped.map((points) =>
      points
        .map((point) => ({
          x: toDateOrUndef(point.timestamp),
          y: point.value,
        }))
        .filter(
          (point): point is MetricPoint => !isNil(point.x) && !isNil(point.y)
        )
    )
  )
}

/** Builds chart series from `MetricResponse` series (labels sent once per series). */
export function getMetricSeriesFromResponses(
  responses: Nullable<Nullable<MetricSeriesFragment>[]>
): MetricSeries[] {
  const nonEmpty = (responses ?? []).filter(isNonNullable)

  return buildMetricSeries(
    nonEmpty.map(({ name, metric }) => ({ name, labels: metric })),
    nonEmpty.map(({ values }) =>
      (values ?? []).filter(isNonNullable).flatMap(({ timestamp, value }) => {
        const x = Number(timestamp)
        const y = Number(value)
        return value != null && Number.isFinite(x) && Number.isFinite(y)
          ? [{ x: new Date(x * 1000), y }]
          : []
      })
    )
  )
}

function buildMetricSeries(
  keys: MetricSeriesKey[],
  data: MetricPoint[][]
): MetricSeries[] {
  const shortLabels = metricSeriesShortLabels(keys)

  return keys.map((key, i) => ({
    id: metricSeriesId(key),
    label: metricSeriesLabel(key),
    shortLabel: shortLabels[i],
    data: data[i],
  }))
}

export function metricSeriesId({ name, labels }: MetricSeriesKey): string {
  return `${name ?? 'metric'}{${metricLabelEntries(labels)
    .map(([key, value]) => `${key}:${value}`)
    .join(',')}}`
}

/**
 * Restricts every series to points within `durationMs` of the latest point,
 * dropping series left without points.
 */
export function filterMetricSeriesByDuration(
  series: MetricSeries[],
  durationMs: number
): MetricSeries[] {
  let latest = -Infinity
  for (const { data } of series)
    for (const { x } of data) latest = Math.max(latest, x.getTime())

  const from = latest - durationMs

  return series
    .map((s) => ({ ...s, data: s.data.filter(({ x }) => x.getTime() >= from) }))
    .filter(({ data }) => data.length > 0)
}

function metricSeriesLabel({ name, labels }: MetricSeriesKey): string {
  const label = metricLabelEntries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')

  return label || name || 'metric'
}

/**
 * Drops tags shared by every series, then keeps the most distinguishing
 * remaining tags (highest cardinality first) up to SHORT_LABEL_MAX_TAGS.
 */
function metricSeriesShortLabels(metrics: MetricSeriesKey[]): string[] {
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
