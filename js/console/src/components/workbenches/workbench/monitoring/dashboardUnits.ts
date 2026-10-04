import {
  niceAxis,
  type NiceAxis,
  type TickBase,
} from 'components/utils/axisTicks'
import { DashboardGraphUnit } from 'generated/graphql'

const SI_SUFFIXES = ['', 'k', 'M', 'G', 'T', 'P']
const BYTE_SUFFIXES = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

const DURATION_STEPS: { seconds: number; suffix: string }[] = [
  { seconds: 86400, suffix: 'd' },
  { seconds: 3600, suffix: 'h' },
  { seconds: 60, suffix: 'm' },
  { seconds: 1, suffix: 's' },
  { seconds: 1e-3, suffix: 'ms' },
  { seconds: 1e-6, suffix: 'µs' },
  { seconds: 1e-9, suffix: 'ns' },
]

/**
 * Formats a value compactly for axes and tooltips, e.g. `1.2k`, `512 MB`,
 * `340ms`, `250m` (millicores). TIME is in seconds, MILLISECONDS in ms, CPU
 * in cores, and PERCENT on a 0-100 scale.
 */
export function formatUnitValue(
  value: number,
  unit: Nullable<DashboardGraphUnit>
): string {
  if (!Number.isFinite(value)) return '—'
  switch (unit) {
    case DashboardGraphUnit.Bytes:
      return scaled(value, 1024, BYTE_SUFFIXES, ' ')
    case DashboardGraphUnit.Time:
      return duration(value)
    case DashboardGraphUnit.Milliseconds:
      return duration(value / 1000)
    case DashboardGraphUnit.Cpu:
      return cores(value)
    case DashboardGraphUnit.Percent:
      return `${trim(value)}%`
    case DashboardGraphUnit.None:
    default:
      return scaled(value, 1000, SI_SUFFIXES, '')
  }
}

function scaled(
  value: number,
  base: number,
  suffixes: string[],
  separator: string
) {
  let scaledValue = Math.abs(value)
  let index = 0
  while (scaledValue >= base && index < suffixes.length - 1) {
    scaledValue /= base
    index++
  }
  const suffix = suffixes[index]
  const sign = value < 0 ? '-' : ''
  return `${sign}${trim(scaledValue)}${suffix ? `${separator}${suffix}` : ''}`
}

function duration(seconds: number) {
  if (seconds === 0) return '0s'
  const abs = Math.abs(seconds)
  const step =
    DURATION_STEPS.find((candidate) => abs >= candidate.seconds) ??
    DURATION_STEPS[DURATION_STEPS.length - 1]
  const sign = seconds < 0 ? '-' : ''
  return `${sign}${trim(abs / step.seconds)}${step.suffix}`
}

function cores(value: number) {
  if (value === 0) return '0'
  if (Math.abs(value) < 1) return `${trim(value * 1000)}m`
  return trim(value)
}

function trim(value: number) {
  if (value === 0) return '0'
  return String(Number(value.toPrecision(3)))
}

const AXIS_CHAR_PX = 7
const AXIS_TICK_PX = 14

function tickBaseForUnit(unit: Nullable<DashboardGraphUnit>): TickBase {
  switch (unit) {
    case DashboardGraphUnit.Bytes:
      return 'binary'
    case DashboardGraphUnit.Time:
    case DashboardGraphUnit.Milliseconds:
      return 'duration'
    default:
      return 'decimal'
  }
}

export function unitAxis(
  min: number,
  max: number,
  unit: Nullable<DashboardGraphUnit>
): NiceAxis {
  return niceAxis(min, max, {
    base: tickBaseForUnit(unit),
    msPerUnit: unit === DashboardGraphUnit.Time ? 1000 : 1,
  })
}

/** Left margin wide enough for the longest of the given y tick labels. */
export function yAxisLabelsWidth(labels: string[]) {
  if (labels.length === 0) return 40
  const chars = Math.max(...labels.map((label) => label.length))
  return Math.min(Math.max(chars * AXIS_CHAR_PX + AXIS_TICK_PX, 32), 96)
}

/** Left margin wide enough for the longest y tick label in `[min, max]`. */
export function yAxisWidth(
  min: number,
  max: number,
  unit: Nullable<DashboardGraphUnit>
) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 40
  const samples = [min, max, (min + max) / 2, 0]
  return yAxisLabelsWidth(samples.map((value) => formatUnitValue(value, unit)))
}

/** Right margin so the last x tick label (centered on the edge) isn't clipped. */
export function xAxisOverhang(labelChars: number) {
  return Math.max(Math.ceil((labelChars * AXIS_CHAR_PX) / 2) + 4, 16)
}
