import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { toDateOrUndef, formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import parseDuration from 'parse-duration-ms'
import { ChartRangeTooltip } from './ChartRangeTooltip'
import type { LogsTimeRange } from './Logs'

const Y_AXIS_WIDTH = 36
const X_AXIS_HEIGHT = 28
const CHART_PADDING_BOTTOM = 8
const CHART_CANVAS_HEIGHT = 162
const CHART_BAR_GAP = 2
const SELECTION_SHADOW = 'rgba(2, 3, 24, 0.55)'
const SELECTION_EDGE = '#747af6'
const TOOLTIP_TOP = CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT

type ChartBucket = { timestamp: Date; count: number }

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

  const buckets = useMemo(() => parseBuckets(data), [data])
  const initialLoading = loading && !data

  const bucketCount = buckets.length
  const yMax = Math.max(1, ...buckets.map((b) => b.count))

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
    (index: number) => bucketX(index, rowWidth, bucketCount),
    [rowWidth, bucketCount]
  )
  const toIndex = useCallback(
    (x: number) => xToIndex(x, rowWidth, bucketCount),
    [rowWidth, bucketCount]
  )

  const rangeIndices = useMemo(
    () => rangeIndicesForFilter(buckets, rangeFilter, bucketMs),
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
        range: bucketRange(
          buckets,
          dragIndices.startIdx,
          dragIndices.endIdx,
          bucketMs
        ),
        stats: buckets
          .slice(dragIndices.startIdx, dragIndices.endIdx + 1)
          .reduce((sum, b) => sum + b.count, 0),
        left: Y_AXIS_WIDTH + selectionBounds.left + selectionBounds.width / 2,
      }
    }

    if (hoveredIndex === null || !buckets[hoveredIndex]) return null

    const bucketLeft = bucketX(hoveredIndex, rowWidth, bucketCount)
    const bucketRight = bucketX(hoveredIndex + 1, rowWidth, bucketCount)

    return {
      range: bucketRange(buckets, hoveredIndex, hoveredIndex, bucketMs),
      stats: buckets[hoveredIndex].count,
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
    return Math.min(Math.max(clientX - rect.left, 0), rect.width)
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
          onRangeSelect(bucketRange(buckets, startIdx, endIdx, bucketMs))
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

  if (buckets.length === 0) return null

  return (
    <ChartWrapperSC ref={chartWrapperRef}>
      <ChartCanvasSC>
        <YAxisSC>
          <span>{compactCount(yMax)}</span>
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
        {tickIndices(bucketCount).map((i, tickIdx, indices) => {
          const isFirst = tickIdx === 0
          const isLast = tickIdx === indices.length - 1

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
              {formatDateTime(
                buckets[i].timestamp,
                sinceSeconds >= 86400 ? 'MM/DD' : 'HH:mm',
                true,
                true
              )}
            </XTickSC>
          )
        })}
      </XAxisSC>
      {chartTooltip && (
        <ChartRangeTooltip
          anchorRef={chartWrapperRef}
          left={chartTooltip.left}
          top={TOOLTIP_TOP}
          range={chartTooltip.range}
          count={chartTooltip.stats}
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
  background: SELECTION_SHADOW,
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
  backgroundColor: SELECTION_EDGE,
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

function bucketSizeForWindow(seconds: number): string {
  if (seconds <= 60) return '1s'
  if (seconds <= 900) return '15s'
  if (seconds <= 1800) return '30s'
  if (seconds <= 3600) return '1m'
  if (seconds <= 86400) return '30m'
  return '6h'
}

function bucketDurationMs(bucketSize: string): number {
  return parseDuration(bucketSize) ?? 60_000
}

function parseBuckets(
  data: ReturnType<typeof useLogAggregationBucketsQuery>['data']
): ChartBucket[] {
  return (data?.logAggregationBuckets?.filter(isNonNullable) ?? [])
    .map((b) => ({
      timestamp: toDateOrUndef(b.timestamp)!,
      count: b.count ?? 0,
    }))
    .filter((b) => b.timestamp)
}

function bucketX(index: number, rowWidth: number, bucketCount: number): number {
  return bucketCount ? (index / bucketCount) * rowWidth : 0
}

function xToIndex(x: number, rowWidth: number, bucketCount: number): number {
  if (!rowWidth || !bucketCount) return 0
  return Math.min(
    Math.max(Math.floor((x / rowWidth) * bucketCount), 0),
    bucketCount - 1
  )
}

function tickIndices(bucketCount: number, maxTicks = 5): number[] {
  if (bucketCount <= 1) return [0]
  const n = Math.min(maxTicks, bucketCount)
  return Array.from({ length: n }, (_, i) =>
    Math.round((i / (n - 1)) * (bucketCount - 1))
  )
}

function rangeIndicesForFilter(
  buckets: ChartBucket[],
  rangeFilter: LogsTimeRange | null,
  bucketMs: number
): { startIdx: number; endIdx: number } | null {
  if (!rangeFilter || buckets.length === 0) return null

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

function bucketRange(
  buckets: ChartBucket[],
  startIdx: number,
  endIdx: number,
  bucketMs: number
): LogsTimeRange {
  return {
    start: buckets[startIdx].timestamp,
    end: new Date(buckets[endIdx].timestamp.getTime() + bucketMs),
  }
}

const compactCount = (count: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)
