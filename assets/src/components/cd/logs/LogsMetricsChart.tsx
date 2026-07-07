import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { clamp, isEmpty } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { ChartRangeTooltip } from './ChartRangeTooltip'
import {
  bucketDurationMs,
  bucketSizeForWindow,
  bucketTimeRange,
  CHART_BAR_GAP,
  CHART_CANVAS_HEIGHT,
  chartTickIndices,
  chartYMax,
  formatChartAxisTime,
  formatCompactCount,
  indexToBucketX,
  LOG_LEVEL_SELECTION_EDGE,
  LOG_LEVEL_SELECTION_SHADOW,
  LogsTimeRange,
  parseAggregationBuckets,
  rangeBucketIndices,
  sumBucketCounts,
  xToBucketIndex,
} from './logsMetricsUtils'

const Y_AXIS_WIDTH = 36
const X_AXIS_HEIGHT = 28
const CHART_PADDING_BOTTOM = 8

type DragState = { startX: number; currentX: number }

export function LogsMetricsChart({
  clusterId,
  serviceId,
  query,
  time,
  operator,
  facets,
  sinceSeconds,
  rangeFilter,
  onRangeSelect,
  pollInterval = 0,
}: {
  clusterId?: string
  serviceId?: string
  query: string
  time: LogTimeRange
  operator: LogQueryOperator
  facets: LogFacetInput[]
  sinceSeconds: number
  rangeFilter: LogsTimeRange | null
  onRangeSelect: (range: LogsTimeRange) => void
  pollInterval?: number
}) {
  const theme = useTheme()
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const barsAreaRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const bucketSize = bucketSizeForWindow(sinceSeconds)
  const bucketMs = bucketDurationMs(bucketSize)
  const skip = !(clusterId || serviceId)

  const { data, loading } = useLogAggregationBucketsQuery({
    variables: {
      clusterId,
      serviceId,
      query,
      time,
      aggregation: { bucketSize },
      operator,
      facets,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip,
  })

  const buckets = useMemo(() => parseAggregationBuckets(data), [data])
  const initialLoading = loading && !data

  const bucketCount = buckets.length
  const yMax = chartYMax(buckets)

  useEffect(() => {
    const node = rowRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      setRowWidth(entry.contentRect.width)
    })
    observer.observe(node)
    setRowWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [bucketCount])

  const toX = useCallback(
    (index: number) => indexToBucketX(index, rowWidth, bucketCount),
    [rowWidth, bucketCount]
  )
  const toIndex = useCallback(
    (x: number) => xToBucketIndex(x, rowWidth, bucketCount),
    [rowWidth, bucketCount]
  )

  const rangeIndices = useMemo(
    () => rangeBucketIndices(buckets, rangeFilter, bucketMs),
    [buckets, rangeFilter, bucketMs]
  )

  const dragIndices = useMemo(
    () =>
      drag
        ? {
            startIdx: toIndex(Math.min(drag.startX, drag.currentX)),
            endIdx: toIndex(Math.max(drag.startX, drag.currentX)),
          }
        : null,
    [drag, toIndex]
  )

  const selectionIndices = dragIndices ?? rangeIndices

  const selectionBounds = useMemo(() => {
    if (!selectionIndices) return null
    const left = toX(selectionIndices.startIdx)
    return {
      left,
      width: toX(selectionIndices.endIdx + 1) - left,
    }
  }, [selectionIndices, toX])

  const chartTooltip = useMemo(() => {
    if (dragIndices && selectionBounds) {
      return {
        range: bucketTimeRange(
          buckets,
          dragIndices.startIdx,
          dragIndices.endIdx,
          bucketMs
        ),
        stats: sumBucketCounts(
          buckets,
          dragIndices.startIdx,
          dragIndices.endIdx
        ),
        left: Y_AXIS_WIDTH + selectionBounds.left + selectionBounds.width / 2,
      }
    }

    if (hoveredIndex === null || !buckets[hoveredIndex]) return null

    const bucketLeft = indexToBucketX(hoveredIndex, rowWidth, bucketCount)
    const bucketRight = indexToBucketX(hoveredIndex + 1, rowWidth, bucketCount)

    return {
      range: bucketTimeRange(buckets, hoveredIndex, hoveredIndex, bucketMs),
      stats: sumBucketCounts(buckets, hoveredIndex, hoveredIndex),
      left: Y_AXIS_WIDTH + (bucketLeft + bucketRight) / 2,
    }
  }, [
    dragIndices,
    selectionBounds,
    hoveredIndex,
    buckets,
    bucketMs,
    rowWidth,
    bucketCount,
  ])

  const relativeX = (e: React.MouseEvent<HTMLDivElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left

  const relativeXFromClient = useCallback((clientX: number) => {
    const area = barsAreaRef.current
    if (!area) return 0
    const rect = area.getBoundingClientRect()
    return clamp(clientX - rect.left, 0, rect.width)
  }, [])

  const isDragging = drag !== null

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const x = relativeXFromClient(e.clientX)
      setDrag((current) => (current ? { ...current, currentX: x } : current))
    }

    const onUp = (e: MouseEvent) => {
      const x = relativeXFromClient(e.clientX)
      setDrag((current) => {
        if (!current) return null
        const startIdx = toIndex(Math.min(current.startX, x))
        const endIdx = toIndex(Math.max(current.startX, x))
        if (Math.abs(current.startX - x) > 3)
          onRangeSelect(bucketTimeRange(buckets, startIdx, endIdx, bucketMs))
        return null
      })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [
    isDragging,
    buckets,
    bucketMs,
    onRangeSelect,
    relativeXFromClient,
    toIndex,
  ])

  if (initialLoading) {
    return (
      <ChartWrapperSC ref={chartWrapperRef}>
        <RectangleSkeleton
          $height={CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT + CHART_PADDING_BOTTOM}
          $width="100%"
        />
      </ChartWrapperSC>
    )
  }

  if (isEmpty(buckets)) return null

  return (
    <ChartWrapperSC ref={chartWrapperRef}>
      <ChartCanvasSC>
        <YAxisSC>
          <span>{formatCompactCount(yMax)}</span>
          <span>0</span>
        </YAxisSC>
        <BarsAreaSC
          ref={barsAreaRef}
          onMouseDown={(e) => {
            setHoveredIndex(null)
            const x = relativeX(e)
            setDrag({ startX: x, currentX: x })
          }}
          onMouseMove={(e) => {
            if (drag) return
            setHoveredIndex(toIndex(relativeX(e)))
          }}
          onMouseLeave={() => {
            if (!drag) setHoveredIndex(null)
          }}
        >
          <BarsRowSC ref={rowRef}>
            {selectionBounds && (
              <>
                <SelectionShadowSC
                  style={{ left: 0, width: selectionBounds.left }}
                />
                <SelectionShadowSC
                  style={{
                    left: selectionBounds.left + selectionBounds.width,
                    right: 0,
                  }}
                />
                <ChartSelectionSC style={selectionBounds}>
                  <SelectionEdgeSC $side="start" />
                  <SelectionEdgeSC $side="end" />
                </ChartSelectionSC>
              </>
            )}
            {buckets.map((bucket) => (
              <ChartBar
                key={bucket.timestamp.getTime()}
                count={bucket.count}
                yMax={yMax}
              />
            ))}
          </BarsRowSC>
        </BarsAreaSC>
      </ChartCanvasSC>
      <XAxisSC style={{ paddingLeft: Y_AXIS_WIDTH + theme.spacing.medium }}>
        {chartTickIndices(bucketCount).map((i, tickIdx, tickIndices) => {
          const isFirst = tickIdx === 0
          const isLast = tickIdx === tickIndices.length - 1

          return (
            <XTickSC
              key={i}
              $align={
                isFirst && isLast
                  ? 'center'
                  : isFirst
                    ? 'start'
                    : isLast
                      ? 'end'
                      : 'center'
              }
              style={{ left: toX(i) + rowWidth / bucketCount / 2 }}
            >
              {formatChartAxisTime(buckets[i].timestamp, sinceSeconds)}
            </XTickSC>
          )
        })}
      </XAxisSC>
      {chartTooltip && (
        <ChartRangeTooltip
          anchorRef={chartWrapperRef}
          offsetX={chartTooltip.left}
          range={chartTooltip.range}
          stats={chartTooltip.stats}
        />
      )}
    </ChartWrapperSC>
  )
}

function ChartBar({ count, yMax }: { count: number; yMax: number }) {
  return <BarSC $height={(count / yMax) * CHART_CANVAS_HEIGHT} />
}

const ChartWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  background: theme.colors['fill-one'],
  borderBottom: theme.borders['fill-two'],
  paddingBottom: CHART_PADDING_BOTTOM,
}))

const ChartCanvasSC = styled.div({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-end',
  height: CHART_CANVAS_HEIGHT,
  paddingTop: 8,
})

const YAxisSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  width: Y_AXIS_WIDTH,
  height: '100%',
  paddingRight: 4,
  paddingTop: 8,
  color: theme.colors['text-xlight'],
  fontSize: 10,
  lineHeight: '14px',
  flexShrink: 0,
}))

const BarsAreaSC = styled.div(({ theme }) => ({
  position: 'relative',
  flex: 1,
  height: '100%',
  overflow: 'hidden',
  paddingRight: theme.spacing.medium,
  cursor: 'crosshair',
  userSelect: 'none',
}))

const BarsRowSC = styled.div({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-end',
  gap: CHART_BAR_GAP,
  height: '100%',
})

const SelectionShadowSC = styled.div({
  position: 'absolute',
  top: 0,
  bottom: 0,
  background: LOG_LEVEL_SELECTION_SHADOW,
  pointerEvents: 'none',
  zIndex: 2,
})

const ChartSelectionSC = styled.div({
  position: 'absolute',
  top: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 3,
})

const SelectionEdgeSC = styled.div<{ $side: 'start' | 'end' }>(({ $side }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 2,
  backgroundColor: LOG_LEVEL_SELECTION_EDGE,
  ...($side === 'start' ? { left: 0 } : { right: 0 }),
}))

const BarSC = styled.div<{ $height: number }>(({ theme, $height }) => ({
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minWidth: 0,
  height: $height,
  backgroundColor: theme.colors['graph-blue'],
  borderTopLeftRadius: 1,
  borderTopRightRadius: 1,
}))

const XAxisSC = styled.div(({ theme }) => ({
  position: 'relative',
  height: X_AXIS_HEIGHT,
  marginTop: 4,
  paddingRight: theme.spacing.medium,
}))

const XTickSC = styled.span<{ $align: 'start' | 'center' | 'end' }>(
  ({ theme, $align }) => ({
    position: 'absolute',
    transform:
      $align === 'start'
        ? 'none'
        : $align === 'end'
          ? 'translateX(-100%)'
          : 'translateX(-50%)',
    color: theme.colors['text-xlight'],
    fontSize: 10,
    lineHeight: '14px',
    whiteSpace: 'nowrap',
  })
)
