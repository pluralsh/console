import {
  type DashboardRange,
  encodeDuration,
  parseDuration,
} from './dashboardTimeRange'

export const MONITORING_SHARE_RANGE_PARAM = 'range'
export const MONITORING_SHARE_FROM_PARAM = 'from'
export const MONITORING_SHARE_TO_PARAM = 'to'
export const MONITORING_SHARE_INPUT_PREFIX = 'i.'

export function buildMonitoringShareUrl({
  pathname,
  range,
  variables,
  includeFiltersAndRange,
}: {
  pathname: string
  range?: DashboardRange
  variables?: Record<string, string | string[]>
  includeFiltersAndRange: boolean
}) {
  const url = new URL(pathname, window.location.origin)
  if (includeFiltersAndRange) {
    if (range?.live)
      url.searchParams.set(
        MONITORING_SHARE_RANGE_PARAM,
        encodeDuration(range.durationMs)
      )
    else if (range) {
      url.searchParams.set(
        MONITORING_SHARE_FROM_PARAM,
        range.start.toISOString()
      )
      url.searchParams.set(MONITORING_SHARE_TO_PARAM, range.end.toISOString())
    }
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
  range?: DashboardRange
  variables: Record<string, string | string[]>
} {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  )

  const variables: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    if (!key.startsWith(MONITORING_SHARE_INPUT_PREFIX)) continue
    const name = key.slice(MONITORING_SHARE_INPUT_PREFIX.length)
    if (!name) continue
    const values = params.getAll(key)
    variables[name] = values.length > 1 ? values : (values[0] ?? '')
  }

  return { range: parseShareRange(params), variables }
}

function parseShareRange(params: URLSearchParams): DashboardRange | undefined {
  const from = parseShareDate(params.get(MONITORING_SHARE_FROM_PARAM))
  const to = parseShareDate(params.get(MONITORING_SHARE_TO_PARAM))
  if (from && to && from < to) return { live: false, start: from, end: to }

  const rangeParam = params.get(MONITORING_SHARE_RANGE_PARAM)
  const durationMs = rangeParam ? parseDuration(rangeParam) : null
  return durationMs ? { live: true, durationMs } : undefined
}

function parseShareDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
