const PADDING_RATIO = 0.1

// nivo's 'auto' bounds only span the plotted data, so a threshold outside that
// range (or perfectly flat data, which collapses the domain) renders at the
// wrong height. Bounds here always include the threshold.
export function thresholdYScale(
  values: number[],
  threshold: number,
  floor?: number
) {
  let min = floor === undefined ? threshold : Math.min(threshold, floor)
  let max = threshold
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  const padding =
    max === min
      ? Math.max(Math.abs(max) * PADDING_RATIO, 1)
      : (max - min) * PADDING_RATIO

  return {
    type: 'linear' as const,
    min: min === floor ? min : min - padding,
    max: max + padding,
    nice: true,
  }
}
