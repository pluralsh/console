const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const TIME_STEPS = [
  SECOND,
  5 * SECOND,
  10 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
  14 * DAY,
  30 * DAY,
]

export const AXIS_CHAR_PX = 7
// minimum blank space between neighbouring labels
const LABEL_GAP_PX = 24

export type TimeTicks = {
  ticks: Date[]
  /** d3 time format for the labels. */
  format: string
  labelChars: number
  step: number
}

function labelFormat(step: number, span: number) {
  if (step >= DAY) return { format: '%b %d', labelChars: 6 }
  if (step < MINUTE) return { format: '%H:%M:%S', labelChars: 8 }
  if (span > DAY) return { format: '%b %d %H:%M', labelChars: 12 }
  return { format: '%H:%M', labelChars: 5 }
}

/**
 * Picks horizontally-laid-out x ticks the way Grafana/Datadog do: the
 * smallest clock-aligned step (1m, 5m, 1h, 1d…) whose labels fit in
 * `widthPx` without overlapping. Ticks are aligned to local time, and edge
 * ticks whose labels would overflow the plot by more than `overhangPx` are
 * dropped.
 */
export function niceTimeTicks(
  start: Date,
  end: Date,
  widthPx: number,
  { overhangPx = { left: 0, right: 0 } } = {}
): TimeTicks {
  const from = start.getTime()
  const to = end.getTime()
  const span = Math.max(to - from, 1)
  const width = Math.max(widthPx, 1)

  let step = TIME_STEPS[TIME_STEPS.length - 1]
  let label = labelFormat(step, span)
  for (const candidate of TIME_STEPS) {
    const candidateLabel = labelFormat(candidate, span)
    const slotPx = candidateLabel.labelChars * AXIS_CHAR_PX + LABEL_GAP_PX
    if ((candidate / span) * width >= slotPx) {
      step = candidate
      label = candidateLabel
      break
    }
  }

  const halfLabelPx = (label.labelChars * AXIS_CHAR_PX) / 2
  const ticks: Date[] = []
  for (let t = alignUp(from, step); t <= to; t += step) {
    const x = ((t - from) / span) * width
    if (x - halfLabelPx < -overhangPx.left) continue
    if (x + halfLabelPx > width + overhangPx.right) continue
    ticks.push(new Date(t))
  }

  return { ticks, step, ...label }
}

function alignUp(time: number, step: number) {
  const offset = new Date(time).getTimezoneOffset() * MINUTE
  const local = time - offset
  if (step > DAY) {
    const day = Math.ceil(local / DAY) * DAY
    return day + offset
  }
  return Math.ceil(local / step) * step + offset
}
