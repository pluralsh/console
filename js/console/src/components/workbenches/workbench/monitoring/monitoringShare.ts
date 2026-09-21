import type { MetricsTimeRange } from '../job/WorkbenchJobActivityResults'

export const MONITORING_SHARE_RANGE_PARAM = 'range'
export const MONITORING_SHARE_INPUT_PREFIX = 'i.'

const RANGES = new Set<MetricsTimeRange>(['1d', '1m', '1y', 'max'])

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
      if (Array.isArray(value)) {
        if (value.length === 0) continue
        url.searchParams.set(
          `${MONITORING_SHARE_INPUT_PREFIX}${name}`,
          value.join(',')
        )
      } else if (value !== '') {
        url.searchParams.set(`${MONITORING_SHARE_INPUT_PREFIX}${name}`, value)
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
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(MONITORING_SHARE_INPUT_PREFIX)) continue
    const name = key.slice(MONITORING_SHARE_INPUT_PREFIX.length)
    if (!name) continue
    variables[name] = value.includes(',')
      ? value.split(',').filter(Boolean)
      : value
  }

  return { range, variables }
}
