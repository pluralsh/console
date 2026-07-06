import parseDuration from 'parse-duration-ms'
import { clamp, isEmpty, keyBy, max, range } from 'lodash'
import { useLogAggregationBucketsQuery } from 'generated/graphql'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { LogLevel } from './LogLine'

export type LogsTimeRange = {
  start: Date
  end: Date
}

export type AggregationBucket = {
  timestamp: Date
  count: number
}

export type StackedBucket = {
  timestamp: Date
  total: number
  levels: Record<LogLevel, number>
}

export const CHART_CANVAS_HEIGHT = 162
export const CHART_BAR_GAP = 2
export const LOG_LEVEL_SELECTION_OVERLAY = 'rgba(93, 99, 244, 0.2)'

export const LOG_LEVEL_CHART_LAYERS = [
  { level: LogLevel.SUCCESS, query: 'success' },
  { level: LogLevel.WARN, query: 'warn OR warning' },
  { level: LogLevel.ERROR, query: 'error OR fatal' },
  { level: LogLevel.INFO, query: 'info' },
] as const

const LEVEL_PARTITION_ORDER = [
  LogLevel.ERROR,
  LogLevel.WARN,
  LogLevel.INFO,
  LogLevel.SUCCESS,
] as const

export function bucketSizeForWindow(seconds: number): string {
  if (seconds <= 60) return '5s'
  if (seconds <= 900) return '1m'
  if (seconds <= 1800) return '2m'
  if (seconds <= 3600) return '5m'
  if (seconds <= 86400) return '1h'
  return '6h'
}

export function bucketDurationMs(bucketSize: string): number {
  return parseDuration(bucketSize) ?? 60_000
}

export function combineLogQuery(base: string, levelQuery: string): string {
  const trimmed = base.trim()
  if (!trimmed) return levelQuery
  return `(${trimmed}) AND (${levelQuery})`
}

export function parseAggregationBuckets(
  data: ReturnType<typeof useLogAggregationBucketsQuery>['data']
): AggregationBucket[] {
  return (data?.logAggregationBuckets?.filter(isNonNullable) ?? [])
    .map((b) => ({
      timestamp: toDateOrUndef(b.timestamp)!,
      count: b.count ?? 0,
    }))
    .filter((b) => b.timestamp)
}

export function mergeStackedBuckets(
  totalBuckets: AggregationBucket[],
  levelBuckets: AggregationBucket[][]
): StackedBucket[] {
  const levelCountsByTs = levelBuckets.map((buckets) =>
    keyBy(buckets, (b) => b.timestamp.getTime())
  )

  return totalBuckets.map((bucket) => {
    const ts = bucket.timestamp.getTime()
    const raw = Object.fromEntries(
      LOG_LEVEL_CHART_LAYERS.map(({ level }, i) => [
        level,
        levelCountsByTs[i]?.[ts]?.count ?? 0,
      ])
    ) as Record<(typeof LOG_LEVEL_CHART_LAYERS)[number]['level'], number>

    let remaining = bucket.count
    const levels = {
      [LogLevel.SUCCESS]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.FATAL]: 0,
      [LogLevel.UNKNOWN]: 0,
    }

    for (const level of LEVEL_PARTITION_ORDER) {
      const assigned = Math.min(raw[level], remaining)
      levels[level] = assigned
      remaining -= assigned
    }
    levels[LogLevel.UNKNOWN] = remaining

    return { timestamp: bucket.timestamp, total: bucket.count, levels }
  })
}

export function chartYMax(buckets: StackedBucket[]): number {
  return niceMax(max([1, ...buckets.map((b) => b.total)]) ?? 1)
}

export function chartTickIndices(bucketCount: number, maxTicks = 5): number[] {
  if (bucketCount <= 1) return [0]
  const tickCount = Math.min(maxTicks, bucketCount)
  return range(tickCount).map((i) =>
    Math.round((i / (tickCount - 1)) * (bucketCount - 1))
  )
}

export function indexToBucketX(
  index: number,
  rowWidth: number,
  bucketCount: number
): number {
  return bucketCount ? (index / bucketCount) * rowWidth : 0
}

export function xToBucketIndex(
  x: number,
  rowWidth: number,
  bucketCount: number
): number {
  if (!rowWidth || !bucketCount) return 0
  return clamp(Math.floor((x / rowWidth) * bucketCount), 0, bucketCount - 1)
}

export function rangeBucketIndices(
  buckets: StackedBucket[],
  rangeFilter: LogsTimeRange | null,
  bucketMs: number
): { startIdx: number; endIdx: number } | null {
  if (!rangeFilter || isEmpty(buckets)) return null

  const startMs = rangeFilter.start.getTime()
  const endMs = rangeFilter.end.getTime()
  let startIdx = buckets.findIndex((b) => b.timestamp.getTime() >= startMs)
  if (startIdx === -1) startIdx = 0

  let endIdx = buckets.findIndex(
    (b) => b.timestamp.getTime() + bucketMs > endMs
  )
  if (endIdx === -1) endIdx = buckets.length - 1
  else endIdx = Math.max(startIdx, endIdx - 1)

  return { startIdx, endIdx }
}

export function bucketTimeRange(
  buckets: StackedBucket[],
  startIdx: number,
  endIdx: number,
  bucketMs: number
): LogsTimeRange {
  return {
    start: buckets[startIdx].timestamp,
    end: new Date(buckets[endIdx].timestamp.getTime() + bucketMs),
  }
}

export function niceMax(value: number): number {
  if (value <= 10) return 10
  if (value <= 20) return 20
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

export function formatCompactCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`
  return `${count}`
}

export function formatRangeTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}

export function formatRangeWindow(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `${minutes} minute window`
  const hours = Math.round(minutes / 60)
  return `${hours} hour window`
}

export function formatChartAxisTime(date: Date, sinceSeconds: number): string {
  if (sinceSeconds >= 86400) {
    return date.toLocaleDateString('en-GB', {
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    })
  }
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}
