import type { LineCustomSvgLayerProps, LineSeries, SliceData } from '@nivo/line'
import { useTooltip } from '@nivo/tooltip'
import { createElement, type MouseEvent } from 'react'

import { SeriesSliceTooltip } from './ChartTooltip'

function nearestSlice<S extends LineSeries>(
  slices: readonly SliceData<S>[],
  x: number
) {
  let lo = 0
  let hi = slices.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (slices[mid].x < x) lo = mid + 1
    else hi = mid
  }
  const prev = slices[lo - 1]
  return prev && x - prev.x < slices[lo].x - x ? prev : slices[lo]
}

/**
 * Replaces nivo's 'slices' layer, which renders a hover <rect> per timestamp
 * and dominates the DOM of a dense chart, with one rect covering the plot.
 * Requires `enableSlices="x"` so nivo still computes the slices.
 */
export function SliceHover<S extends LineSeries>({
  innerWidth,
  innerHeight,
  slices,
  setCurrentSlice,
}: LineCustomSvgLayerProps<S>) {
  const { showTooltipFromEvent, hideTooltip } = useTooltip()
  const show = (e: MouseEvent<SVGRectElement>) => {
    if (slices.length === 0) return
    const { left } = e.currentTarget.getBoundingClientRect()
    const slice = nearestSlice(slices, e.clientX - left)
    setCurrentSlice(slice)
    showTooltipFromEvent(
      createElement(SeriesSliceTooltip, { slice, axis: 'x' }),
      e,
      'right'
    )
  }

  return (
    <rect
      width={innerWidth}
      height={innerHeight}
      fill="transparent"
      onMouseEnter={show}
      onMouseMove={show}
      onMouseLeave={() => {
        hideTooltip()
        setCurrentSlice(null)
      }}
    />
  )
}
