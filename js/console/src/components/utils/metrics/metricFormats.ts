import type { TickBase } from 'components/utils/axisTicks'
import type { MetricResponseFragment } from 'generated/graphql'
import { Prometheus } from 'utils/prometheus'

export type MetricFormat =
  'cpu' | 'memory' | 'bytesRate' | 'percent' | 'rate' | 'count'

const BYTE_SUFFIXES = ['B', 'KiB', 'MiB', 'GiB', 'TiB']

function trim(value: number) {
  return String(Number(value.toPrecision(3)))
}

function formatBytes(value: number) {
  let scaled = Math.abs(value)
  let i = 0
  while (scaled >= 1024 && i < BYTE_SUFFIXES.length - 1) {
    scaled /= 1024
    i++
  }
  return `${value < 0 ? '-' : ''}${trim(scaled)} ${BYTE_SUFFIXES[i]}`
}

export const METRIC_FORMATTERS: Record<
  MetricFormat,
  (value: number) => string
> = {
  cpu: (v) => Prometheus.format(v, 'cpu'),
  memory: (v) => Prometheus.format(v, 'memory'),
  bytesRate: (v) => `${formatBytes(v)}/s`,
  percent: (v) => `${trim(v * 100)}%`,
  rate: (v) => `${trim(v)}/s`,
  count: (v) => String(Math.round(v)),
}

export const METRIC_TICK_BASES: Record<MetricFormat, TickBase> = {
  cpu: 'decimal',
  memory: 'binary',
  bytesRate: 'binary',
  percent: 'decimal',
  rate: 'decimal',
  count: 'integer',
}

export function toPoints(values: MetricResponseFragment['values']) {
  return (values ?? []).flatMap((value) => {
    if (value?.timestamp == null || value.value == null) return []
    const y = parseFloat(value.value)
    if (!Number.isFinite(y)) return []
    return [{ x: new Date(value.timestamp * 1000), y }]
  })
}
