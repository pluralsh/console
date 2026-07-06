import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { LogLevel, logLevelToColor } from './LogLine'
import {
  bucketDurationMs,
  bucketSizeForWindow,
  CHART_BAR_GAP,
  CHART_CANVAS_HEIGHT,
  combineLogQuery,
  formatChartAxisTime,
  formatCompactCount,
  formatRangeTime,
  LOG_LEVEL_CHART_LAYERS,
  LOG_LEVEL_SELECTION_OVERLAY,
  LogsTimeRange,
  mergeStackedBuckets,
  StackedBucket,
} from './logsMetricsUtils'

const Y_AXIS_WIDTH = 36
const X_AXIS_HEIGHT = 28
const CHART_PADDING_BOTTOM = 8

const STACK_ORDER = [
  LogLevel.SUCCESS,
  LogLevel.WARN,
  LogLevel.ERROR,
  LogLevel.INFO,
  LogLevel.UNKNOWN,
] as const

function parseBuckets(
  data: ReturnType<typeof useLogAggregationBucketsQuery>['data']
) {
  return (data?.logAggregationBuckets?.filter(isNonNullable) ?? [])
    .map((b) => ({
      timestamp: toDateOrUndef(b.timestamp)!,
      count: b.count ?? 0,
    }))
    .filter((b) => b.timestamp)
}

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [drag, setDrag] = useState<{ startX: number; currentX: number } | null>(
    null
  )
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const bucketSize = useMemo(
    () => bucketSizeForWindow(sinceSeconds),
    [sinceSeconds]
  )
  const bucketMs = useMemo(() => bucketDurationMs(bucketSize), [bucketSize])

  const baseVars = {
    clusterId,
    serviceId,
    time,
    aggregation: { bucketSize },
    operator,
    facets,
  }

  const { data: totalData, loading: totalLoading } =
    useLogAggregationBucketsQuery({
      variables: { ...baseVars, query },
      fetchPolicy: 'cache-and-network',
      pollInterval,
      skip: !(clusterId || serviceId),
    })

  const successData = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[0].query),
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip: !(clusterId || serviceId),
  })

  const warnData = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[1].query),
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip: !(clusterId || serviceId),
  })

  const errorData = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[2].query),
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip: !(clusterId || serviceId),
  })

  const infoData = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[3].query),
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip: !(clusterId || serviceId),
  })

  const buckets: StackedBucket[] = useMemo(() => {
    const total = parseBuckets(totalData)
    if (!total.length) return []
    return mergeStackedBuckets(total, [
      parseBuckets(successData.data),
      parseBuckets(warnData.data),
      parseBuckets(errorData.data),
      parseBuckets(infoData.data),
    ])
  }, [
    totalData,
    successData.data,
    warnData.data,
    errorData.data,
    infoData.data,
  ])

  const observeWidth = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    setWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [buckets.length])

  const barsAreaWidth = Math.max(0, width - Y_AXIS_WIDTH - theme.spacing.medium)
  const barsRowRef = useRef<HTMLDivElement>(null)

  const getBarsRowWidth = useCallback(
    () => barsRowRef.current?.clientWidth ?? barsAreaWidth,
    [barsAreaWidth]
  )

  const maxCount = Math.max(...buckets.map((b) => b.total), 1)
  const yMax = niceMax(maxCount)

  const indexToX = useCallback(
    (index: number) => {
      const rowWidth = getBarsRowWidth()
      return (index / buckets.length) * rowWidth
    },
    [getBarsRowWidth, buckets.length]
  )

  const xToIndex = useCallback(
    (x: number) => {
      const rowWidth = getBarsRowWidth()
      if (!rowWidth) return 0
      return Math.max(
        0,
        Math.min(
          buckets.length - 1,
          Math.floor((x / rowWidth) * buckets.length)
        )
      )
    },
    [getBarsRowWidth, buckets.length]
  )

  const rangeIndices = useMemo(() => {
    if (!rangeFilter || !buckets.length) return null
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
  }, [rangeFilter, buckets, bucketMs])

  const dragIndices = useMemo(() => {
    if (!drag) return null
    const startIdx = xToIndex(Math.min(drag.startX, drag.currentX))
    const endIdx = xToIndex(Math.max(drag.startX, drag.currentX))
    return { startIdx, endIdx }
  }, [drag, xToIndex])

  const activeIndices = dragIndices ?? rangeIndices

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setDrag({ startX: x, currentX: x })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (drag) setDrag({ ...drag, currentX: x })
    else setHoveredIndex(xToIndex(x))
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag || !buckets.length) {
      setDrag(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const startIdx = xToIndex(Math.min(drag.startX, x))
    const endIdx = xToIndex(Math.max(drag.startX, x))

    if (Math.abs(drag.startX - x) > 3) {
      const start = buckets[startIdx].timestamp
      const end = new Date(buckets[endIdx].timestamp.getTime() + bucketMs)
      onRangeSelect({ start, end })
    }
    setDrag(null)
  }

  const handleMouseLeave = () => {
    setDrag(null)
    setHoveredIndex(null)
  }

  const xTickIndices = useMemo(() => {
    if (buckets.length <= 1) return [0]
    const count = Math.min(5, buckets.length)
    return Array.from({ length: count }, (_, i) =>
      Math.round((i / (count - 1)) * (buckets.length - 1))
    )
  }, [buckets.length])

  const loading = totalLoading && !totalData

  if (loading) {
    return (
      <ChartWrapperSC ref={observeWidth}>
        <RectangleSkeleton
          $height={CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT + CHART_PADDING_BOTTOM}
          $width="100%"
        />
      </ChartWrapperSC>
    )
  }

  if (!buckets.length) return null

  const dragPreview =
    drag && dragIndices
      ? {
          x: indexToX(dragIndices.startIdx),
          width:
            indexToX(dragIndices.endIdx + 1) - indexToX(dragIndices.startIdx),
          start: buckets[dragIndices.startIdx].timestamp,
          end: new Date(
            buckets[dragIndices.endIdx].timestamp.getTime() + bucketMs
          ),
        }
      : null

  const hoveredBucket =
    hoveredIndex != null && !drag ? buckets[hoveredIndex] : null

  return (
    <ChartWrapperSC ref={observeWidth}>
      <ChartCanvasSC>
        <YAxisSC>
          <span>{formatCompactCount(yMax)}</span>
          <span>0</span>
        </YAxisSC>
        <BarsAreaSC
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <BarsRowSC ref={barsRowRef}>
            {activeIndices && (
              <SelectionOverlaySC
                style={{
                  left: indexToX(activeIndices.startIdx),
                  width:
                    indexToX(activeIndices.endIdx + 1) -
                    indexToX(activeIndices.startIdx),
                }}
              />
            )}
            {buckets.map((bucket) => {
              const scale = (count: number) =>
                (count / yMax) * CHART_CANVAS_HEIGHT
              const visibleLevels = STACK_ORDER.filter(
                (level) => bucket.levels[level] > 0
              )
              const topLevel = visibleLevels[visibleLevels.length - 1]
              return (
                <BarStackSC key={bucket.timestamp.getTime()}>
                  {STACK_ORDER.map((level) => {
                    const count = bucket.levels[level]
                    if (!count) return null
                    return (
                      <BarSegmentSC
                        key={level}
                        $color={theme.colors[logLevelToColor[level]]}
                        $roundedTop={level === topLevel}
                        style={{ height: scale(count) }}
                      />
                    )
                  })}
                </BarStackSC>
              )
            })}
          </BarsRowSC>

          {dragPreview && (
            <DragTooltipSC
              style={{
                left: dragPreview.x + dragPreview.width / 2,
                top: 0,
              }}
            >
              {formatRangeTime(dragPreview.start)} –{' '}
              {formatRangeTime(dragPreview.end)}
            </DragTooltipSC>
          )}

          {hoveredBucket && !drag && (
            <HoverTooltipSC
              style={{
                left:
                  indexToX(hoveredIndex!) +
                  getBarsRowWidth() / buckets.length / 2,
              }}
            >
              <TooltipHeaderSC>
                {formatRangeTime(hoveredBucket.timestamp)} –{' '}
                {formatRangeTime(
                  new Date(hoveredBucket.timestamp.getTime() + bucketMs)
                )}
              </TooltipHeaderSC>
              <TooltipBodySC>
                {STACK_ORDER.filter((l) => hoveredBucket.levels[l] > 0).map(
                  (level) => (
                    <TooltipRowSC key={level}>
                      <TooltipSwatchSC
                        $color={theme.colors[logLevelToColor[level]]}
                      />
                      <span>{level}</span>
                      <TooltipCountSC>
                        {hoveredBucket.levels[level]}
                      </TooltipCountSC>
                    </TooltipRowSC>
                  )
                )}
              </TooltipBodySC>
            </HoverTooltipSC>
          )}
        </BarsAreaSC>
      </ChartCanvasSC>
      <XAxisSC style={{ paddingLeft: Y_AXIS_WIDTH + theme.spacing.medium }}>
        {xTickIndices.map((i) => {
          const bucket = buckets[i]
          if (!bucket) return null
          return (
            <XTickSC
              key={i}
              style={{
                left: indexToX(i) + getBarsRowWidth() / buckets.length / 2,
              }}
            >
              {formatChartAxisTime(bucket.timestamp, sinceSeconds)}
            </XTickSC>
          )
        })}
      </XAxisSC>
    </ChartWrapperSC>
  )
}

function niceMax(value: number): number {
  if (value <= 10) return 10
  if (value <= 20) return 20
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

const ChartWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  width: '100%',
  background: theme.colors['fill-one'],
  borderBottom: theme.borders['fill-two'],
  paddingBottom: CHART_PADDING_BOTTOM,
}))

const ChartCanvasSC = styled.div({
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
  paddingBottom: 0,
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

const SelectionOverlaySC = styled.div({
  position: 'absolute',
  top: 0,
  bottom: 0,
  background: LOG_LEVEL_SELECTION_OVERLAY,
  pointerEvents: 'none',
  zIndex: 0,
})

const BarStackSC = styled.div({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  height: '100%',
  flex: 1,
  minWidth: 0,
})

const BarSegmentSC = styled.div<{ $color: string; $roundedTop: boolean }>(
  ({ $color, $roundedTop }) => ({
    backgroundColor: $color,
    width: '100%',
    flexShrink: 0,
    ...($roundedTop && {
      borderTopLeftRadius: 1,
      borderTopRightRadius: 1,
    }),
  })
)

const XAxisSC = styled.div({
  position: 'relative',
  height: X_AXIS_HEIGHT,
  marginTop: 4,
})

const XTickSC = styled.span(({ theme }) => ({
  position: 'absolute',
  transform: 'translateX(-50%)',
  color: theme.colors['text-xlight'],
  fontSize: 10,
  lineHeight: '14px',
  whiteSpace: 'nowrap',
}))

const DragTooltipSC = styled.div(({ theme }) => ({
  position: 'absolute',
  transform: 'translate(-50%, -100%)',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  ...theme.partials.text.caption,
  color: theme.colors.text,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  zIndex: 2,
}))

const HoverTooltipSC = styled.div(({ theme }) => ({
  position: 'absolute',
  bottom: '100%',
  transform: 'translate(-50%, -8px)',
  minWidth: 195,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  overflow: 'hidden',
  pointerEvents: 'none',
  zIndex: 2,
}))

const TooltipHeaderSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  borderBottom: theme.borders['fill-two'],
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
}))

const TooltipBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.small,
}))

const TooltipRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
}))

const TooltipSwatchSC = styled.div<{ $color: string }>(({ $color }) => ({
  width: 10,
  height: 10,
  borderRadius: 2,
  backgroundColor: $color,
  flexShrink: 0,
}))

const TooltipCountSC = styled.span({
  marginLeft: 'auto',
})
