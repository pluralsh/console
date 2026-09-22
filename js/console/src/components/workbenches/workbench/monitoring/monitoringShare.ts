import type { MetricsTimeRange } from '../job/WorkbenchJobActivityResults'

export const MONITORING_SHARE_RANGE_PARAM = 'range'
export const MONITORING_SHARE_INPUT_PREFIX = 'i.'

const RANGES = new Set<MetricsTimeRange>(['1h', '2h', '6h', '1d', '7d'])

export function isMetricsTimeRange(value: string): value is MetricsTimeRange {
  return RANGES.has(value as MetricsTimeRange)
}

export function buildMonitoringShareUrl({
  pathname,
  range,
  variables,
  includeFiltersAndRange,
}: {
  pathname: string
  range?: MetricsTimeRange
  variables?: Record<string, string | string[]>
  includeFiltersAndRange: boolean
}) {
  const url = new URL(pathname, window.location.origin)
  if (includeFiltersAndRange) {
    if (range) url.searchParams.set(MONITORING_SHARE_RANGE_PARAM, range)
    for (const [name, value] of Object.entries(variables ?? {})) {
      const key = `${MONITORING_SHARE_INPUT_PREFIX}${name}`
      if (Array.isArray(value)) {
        // Repeated params (not comma-joined): option values may contain commas.
        for (const v of value.filter(Boolean)) url.searchParams.append(key, v)
      } else if (value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

export function parseMonitoringShareSearch(search: string): {
  range?: MetricsTimeRange
  variables: Record<string, string | string[]>
} {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  )
  const rangeParam = params.get(MONITORING_SHARE_RANGE_PARAM)
  const range =
    rangeParam && isMetricsTimeRange(rangeParam) ? rangeParam : undefined

  const variables: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    if (!key.startsWith(MONITORING_SHARE_INPUT_PREFIX)) continue
    const name = key.slice(MONITORING_SHARE_INPUT_PREFIX.length)
    if (!name) continue
    const values = params.getAll(key)
    variables[name] = values.length > 1 ? values : (values[0] ?? '')
  }

  return { range, variables }
}
