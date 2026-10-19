import { MetricSeriesFragment } from 'generated/graphql'
import { uniq } from 'lodash'
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

/** Builds chart series from `MetricResponse` series (labels sent once per series). */
export function getMetricSeriesFromResponses(
  responses: Nullable<Nullable<MetricSeriesFragment>[]>
): MetricSeries[] {
  const nonEmpty = (responses ?? []).filter(isNonNullable)
  const keys = nonEmpty.map(({ name, metric }) => ({ name, labels: metric }))
  const shortLabels = metricSeriesShortLabels(keys)

  return nonEmpty.map(({ values }, i) => ({
    id: metricSeriesId(keys[i]),
    label: metricSeriesLabel(keys[i]),
    shortLabel: shortLabels[i],
    data: (values ?? [])
      .filter(isNonNullable)
      .flatMap(({ timestamp, value }) => {
        const x = Number(timestamp)
        const y = Number(value)
        return value != null && Number.isFinite(x) && Number.isFinite(y)
          ? [{ x: new Date(x * 1000), y }]
          : []
      }),
  }))
}

function metricSeriesId({ name, labels }: MetricSeriesKey): string {
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
