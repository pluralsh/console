export type TickBase = 'decimal' | 'binary' | 'duration' | 'integer'

export type NiceAxis = {
  min: number
  max: number
  step: number
  ticks: number[]
}

const STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10]

const SECOND_MS = 1000
const DAY_MS = 86_400_000

// clock steps used once a duration axis step reaches 1s; sub-second steps stay decimal (1/2/2.5/5 × 10^n ms)
const DURATION_STEPS_MS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600,
  43200, 86400,
].map((seconds) => seconds * SECOND_MS)

export const DEFAULT_TICK_COUNT = 5

function decimalStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const multiplier = STEP_MULTIPLIERS.find((m) => m >= normalized - 1e-9) ?? 10
  return multiplier * magnitude
}

function niceStep(
  raw: number,
  extent: number,
  base: TickBase,
  msPerUnit: number
) {
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
    case 'duration': {
      const rawMs = raw * msPerUnit
      if (rawMs < SECOND_MS) return decimalStep(raw)
      const stepMs =
        DURATION_STEPS_MS.find((s) => s >= rawMs) ??
        decimalStep(rawMs / DAY_MS) * DAY_MS
      return stepMs / msPerUnit
    }
    default:
      return decimalStep(raw)
  }
}

const clean = (value: number) => Number(value.toPrecision(12))

/**
 * Picks a fixed number of evenly spaced, human-friendly y ticks covering
 * `[min, max]`, the way Grafana/Datadog do: steps of 1/2/2.5/5 × 10^n
 * (binary-aligned for bytes, clock-aligned for durations) and the domain
 * snapped outward to whole steps. Duration values are milliseconds unless
 * `msPerUnit` says otherwise (eg 1000 for seconds).
 */
export function niceAxis(
  min: number,
  max: number,
  {
    count = DEFAULT_TICK_COUNT,
    base = 'decimal',
    includeZero = true,
    msPerUnit = 1,
  }: {
    count?: number
    base?: TickBase
    includeZero?: boolean
    msPerUnit?: number
  } = {}
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
  let step = niceStep((hi - lo) / count, extent, base, msPerUnit)
  let start = 0
  let end = 0
  let steps = 0
  // snapping both ends outward can add an interval; step up until it fits
  for (let attempt = 0; attempt < 8; attempt++) {
    start = clean(Math.floor(lo / step + 1e-9) * step)
    end = clean(Math.ceil(hi / step - 1e-9) * step)
    steps = Math.round((end - start) / step)
    if (steps <= count) break
    step = niceStep(step * 1.000001, extent, base, msPerUnit)
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
