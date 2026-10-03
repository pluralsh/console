import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
const CHART_CANVAS_HEIGHT = 130
const CHART_BAR_GAP = 2
const SELECTION_SHADOW = 'rgba(2, 3, 24, 0.55)'
const SELECTION_EDGE = '#747af6'
const TOOLTIP_TOP = CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT

const compactCount = (count: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count)

type ChartBucket = { timestamp: Date; count: number }

export function LogsMetricsChart({
  clusterId,
  serviceId,
  query,
  time,
  operator,
  facets,
  windowSeconds,
  onRangeSelect,
  pollInterval = 0,
}: {
  clusterId?: string
  serviceId?: string
  query: string
  time: LogTimeRange
  operator: LogQueryOperator
  facets: LogFacetInput[]
  windowSeconds: number
  onRangeSelect: (start: Date, end: Date) => void
  pollInterval?: number
}) {
  const theme = useTheme()
  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const barsAreaRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const [drag, setDrag] = useState<{ startX: number; currentX: number } | null>(
    null
  )
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const bucketSize = bucketSizeForWindow(windowSeconds)
  const bucketMs = parseDuration(bucketSize) ?? 60_000

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
    skip: !(clusterId || serviceId),
  })

  const buckets = useMemo(
    () =>
      (data?.logAggregationBuckets?.filter(isNonNullable) ?? [])
        .map((b) => ({
          timestamp: toDateOrUndef(b.timestamp)!,
          count: b.count ?? 0,
        }))
        .filter((b) => b.timestamp),
    [data]
  )
  const initialLoading = loading && !data
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
  }, [buckets.length])

  const toX = useCallback(
    (index: number) => bucketX(index, rowWidth, buckets.length),
    [rowWidth, buckets.length]
  )
  const toIndex = useCallback(
    (x: number) => xToIndex(x, rowWidth, buckets.length),
    [rowWidth, buckets.length]
  )
  const getBarAreaX = useCallback((clientX: number) => {
    const area = barsAreaRef.current
    if (!area) return 0
    const rect = area.getBoundingClientRect()
    return Math.min(Math.max(clientX - rect.left, 0), rect.width)
  }, [])

  const dragRef = useRef(drag)
  const dragContextRef = useRef({
    getBarAreaX,
    toIndex,
    buckets,
    bucketMs,
    onRangeSelect,
  })

  useLayoutEffect(() => {
    dragRef.current = drag
    dragContextRef.current = {
      getBarAreaX,
      toIndex,
      buckets,
      bucketMs,
      onRangeSelect,
    }
  })

  const isDragging = drag !== null

  const selectionIndices = useMemo(() => {
    if (!drag) return null
    return {
      startIdx: toIndex(Math.min(drag.startX, drag.currentX)),
      endIdx: toIndex(Math.max(drag.startX, drag.currentX)),
    }
  }, [drag, toIndex])

  const selectionBounds = useMemo(() => {
    if (!selectionIndices) return null
    const left = toX(selectionIndices.startIdx)
    return { left, width: toX(selectionIndices.endIdx + 1) - left }
  }, [selectionIndices, toX])

  const chartTooltip = useMemo(() => {
    if (drag && selectionIndices && selectionBounds) {
      return {
        range: bucketRange(
          buckets,
          selectionIndices.startIdx,
          selectionIndices.endIdx,
          bucketMs
        ),
        count: buckets
          .slice(selectionIndices.startIdx, selectionIndices.endIdx + 1)
          .reduce((sum, b) => sum + b.count, 0),
        left: Y_AXIS_WIDTH + selectionBounds.left + selectionBounds.width / 2,
      }
    }

    if (hoveredIndex === null || !buckets[hoveredIndex]) return null

    return {
      range: bucketRange(buckets, hoveredIndex, hoveredIndex, bucketMs),
      count: buckets[hoveredIndex].count,
      left:
        Y_AXIS_WIDTH + bucketX(hoveredIndex + 0.5, rowWidth, buckets.length),
    }
  }, [
    drag,
    selectionIndices,
    selectionBounds,
    hoveredIndex,
    buckets,
    bucketMs,
    rowWidth,
  ])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const x = dragContextRef.current.getBarAreaX(e.clientX)
      setDrag((current) => (current ? { ...current, currentX: x } : current))
    }

    const onUp = (e: MouseEvent) => {
      const current = dragRef.current
      if (!current) return

      const { getBarAreaX, toIndex, buckets, bucketMs, onRangeSelect } =
        dragContextRef.current
      const x = getBarAreaX(e.clientX)
      const startIdx = toIndex(Math.min(current.startX, x))
      const endIdx = toIndex(Math.max(current.startX, x))
      const { start, end } = bucketRange(buckets, startIdx, endIdx, bucketMs)
      onRangeSelect(start, end)
      setDrag(null)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

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
            const x = getBarAreaX(e.clientX)
            setDrag({ startX: x, currentX: x })
          }}
          onMouseMove={(e) => {
            if (drag) return
            setHoveredIndex(toIndex(getBarAreaX(e.clientX)))
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
              <BarSC
                key={bucket.timestamp.getTime()}
                $height={(bucket.count / yMax) * CHART_CANVAS_HEIGHT}
              />
            ))}
          </BarsRowSC>
        </BarsAreaSC>
      </ChartCanvasSC>
      <XAxisSC style={{ paddingLeft: Y_AXIS_WIDTH + theme.spacing.medium }}>
        {tickIndices(buckets.length).map((i, tickIdx, indices) => (
          <XTickSC
            key={i}
            $align={tickAlign(tickIdx, indices.length)}
            style={{ left: bucketX(i + 0.5, rowWidth, buckets.length) }}
          >
            {formatDateTime(
              buckets[i].timestamp,
              windowSeconds >= 2 * 86400
                ? 'MM/DD'
                : windowSeconds > 86400
                  ? 'MM/DD HH:mm'
                  : 'HH:mm',
              true,
              true
            )}
          </XTickSC>
        ))}
      </XAxisSC>
      {chartTooltip && (
        <ChartRangeTooltip
          anchorRef={chartWrapperRef}
          left={chartTooltip.left}
          top={TOOLTIP_TOP}
          range={chartTooltip.range}
          count={chartTooltip.count}
        />
      )}
    </ChartWrapperSC>
  )
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

function tickAlign(tickIdx: number, tickCount: number) {
  if (tickCount <= 1) return 'center' as const
  if (tickIdx === 0) return 'start' as const
  if (tickIdx === tickCount - 1) return 'end' as const
  return 'center' as const
}

const BUCKET_SIZES: { seconds: number; value: string }[] = [
  { seconds: 1, value: '1s' },
  { seconds: 5, value: '5s' },
  { seconds: 15, value: '15s' },
  { seconds: 30, value: '30s' },
  { seconds: 60, value: '1m' },
  { seconds: 5 * 60, value: '5m' },
  { seconds: 15 * 60, value: '15m' },
  { seconds: 30 * 60, value: '30m' },
  { seconds: 3600, value: '1h' },
  { seconds: 3 * 3600, value: '3h' },
  { seconds: 6 * 3600, value: '6h' },
]
const MAX_BUCKETS = 90

/** Smallest bucket size that keeps the window within `MAX_BUCKETS` bars. */
export function bucketSizeForWindow(seconds: number): string {
  return (
    BUCKET_SIZES.find((size) => seconds / size.seconds <= MAX_BUCKETS) ??
    BUCKET_SIZES[BUCKET_SIZES.length - 1]
  ).value
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
