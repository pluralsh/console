export type TickBase = 'decimal' | 'binary' | 'duration' | 'integer'

export type NiceAxis = {
  min: number
  max: number
  step: number
  ticks: number[]
}

const STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10]

// seconds; used once a duration axis step reaches 1s
const DURATION_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600,
  43200, 86400,
]

export const DEFAULT_TICK_COUNT = 5

function decimalStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const multiplier = STEP_MULTIPLIERS.find((m) => m >= normalized - 1e-9) ?? 10
  return multiplier * magnitude
}

function niceStep(raw: number, extent: number, base: TickBase) {
  switch (base) {
    case 'binary': {
      // step in whole units of the largest binary prefix (Ki, Mi, Gi…) under the extent
      const unit =
        1024 ** Math.max(0, Math.floor(Math.log(extent) / Math.log(1024)))
      return Math.max(decimalStep(raw / unit) * unit, 1)
    }
    case 'integer': {
      if (raw <= 1) return 1
      const step = decimalStep(raw)
      return Number.isInteger(step) ? step : decimalStep(step * 1.000001)
    }
    case 'duration':
      if (raw < 1) return decimalStep(raw)
      return (
        DURATION_STEPS.find((s) => s >= raw) ?? decimalStep(raw / 86400) * 86400
      )
    default:
      return decimalStep(raw)
  }
}

const clean = (value: number) => Number(value.toPrecision(12))

/**
 * Picks a fixed number of evenly spaced, human-friendly y ticks covering
 * `[min, max]`, the way Grafana/Datadog do: steps of 1/2/2.5/5 × 10^n
 * (binary-aligned for bytes, clock-aligned for durations) and the domain
 * snapped outward to whole steps.
 */
export function niceAxis(
  min: number,
  max: number,
  {
    count = DEFAULT_TICK_COUNT,
    base = 'decimal',
    includeZero = true,
  }: { count?: number; base?: TickBase; includeZero?: boolean } = {}
): NiceAxis {
  let lo = Number.isFinite(min) ? min : 0
  let hi = Number.isFinite(max) ? max : 0
  if (includeZero) {
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 0)
  }
  if (hi === lo) {
    const pad = Math.abs(hi) * 0.5 || 1
    hi += pad
    if (!includeZero || lo !== 0) lo -= pad
  }

  const extent = Math.max(Math.abs(lo), Math.abs(hi))
  let step = niceStep((hi - lo) / count, extent, base)
  let start = 0
  let end = 0
  let steps = 0
  // snapping both ends outward can add an interval; step up until it fits
  for (let attempt = 0; attempt < 8; attempt++) {
    start = clean(Math.floor(lo / step + 1e-9) * step)
    end = clean(Math.ceil(hi / step - 1e-9) * step)
    steps = Math.round((end - start) / step)
    if (steps <= count) break
    step = niceStep(step * 1.000001, extent, base)
  }
  const ticks = Array.from({ length: steps + 1 }, (_, i) =>
    clean(start + i * step)
  )

  return { min: start, max: end, step, ticks }
}

export function seriesExtent(values: Iterable<unknown>) {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}
