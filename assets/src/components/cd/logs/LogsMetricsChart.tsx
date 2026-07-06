import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { LogLevel, logLevelToColor } from './LogLine'
import {
  bucketDurationMs,
  bucketSizeForWindow,
  CHART_BAR_GAP,
  CHART_CANVAS_HEIGHT,
  combineLogQuery,
  formatChartAxisTime,
  formatCompactCount,
  LOG_LEVEL_CHART_LAYERS,
  LOG_LEVEL_SELECTION_OVERLAY,
  LogsTimeRange,
  mergeStackedBuckets,
  niceMax,
  parseAggregationBuckets,
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
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)

  const bucketSize = bucketSizeForWindow(sinceSeconds)
  const bucketMs = bucketDurationMs(bucketSize)
  const skip = !(clusterId || serviceId)
  const baseVars = {
    clusterId,
    serviceId,
    time,
    aggregation: { bucketSize },
    operator,
    facets,
  }
  const queryOpts = {
    fetchPolicy: 'cache-and-network' as const,
    pollInterval,
    skip,
  }

  const { data: totalData, loading } = useLogAggregationBucketsQuery({
    variables: { ...baseVars, query },
    ...queryOpts,
  })
  const { data: successData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[0].query),
    },
    ...queryOpts,
  })
  const { data: warnData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[1].query),
    },
    ...queryOpts,
  })
  const { data: errorData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[2].query),
    },
    ...queryOpts,
  })
  const { data: infoData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[3].query),
    },
    ...queryOpts,
  })

  const buckets = useMemo(() => {
    const total = parseAggregationBuckets(totalData)
    if (!total.length) return []
    return mergeStackedBuckets(total, [
      parseAggregationBuckets(successData),
      parseAggregationBuckets(warnData),
      parseAggregationBuckets(errorData),
      parseAggregationBuckets(infoData),
    ])
  }, [totalData, successData, warnData, errorData, infoData])

  const yMax = niceMax(Math.max(...buckets.map((b) => b.total), 1))

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

  const indexToX = (index: number) =>
    buckets.length ? (index / buckets.length) * rowWidth : 0

  const xToIndex = (x: number) => {
    if (!rowWidth || !buckets.length) return 0
    return Math.max(
      0,
      Math.min(buckets.length - 1, Math.floor((x / rowWidth) * buckets.length))
    )
  }

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

  const dragIndices = drag
    ? {
        startIdx: xToIndex(Math.min(drag.startX, drag.currentX)),
        endIdx: xToIndex(Math.max(drag.startX, drag.currentX)),
      }
    : null

  const selectionIndices = dragIndices ?? rangeIndices

  const bucketRange = (startIdx: number, endIdx: number) => ({
    start: buckets[startIdx].timestamp,
    end: new Date(buckets[endIdx].timestamp.getTime() + bucketMs),
  })

  const relativeX = (e: React.MouseEvent<HTMLDivElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left

  if (loading && !totalData) {
    return (
      <ChartWrapperSC>
        <RectangleSkeleton
          $height={CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT + CHART_PADDING_BOTTOM}
          $width="100%"
        />
      </ChartWrapperSC>
    )
  }

  if (!buckets.length) return null

  const xTickIndices =
    buckets.length <= 1
      ? [0]
      : Array.from({ length: Math.min(5, buckets.length) }, (_, i) =>
          Math.round(
            (i / (Math.min(5, buckets.length) - 1)) * (buckets.length - 1)
          )
        )

  return (
    <ChartWrapperSC>
      <ChartCanvasSC>
        <YAxisSC>
          <span>{formatCompactCount(yMax)}</span>
          <span>0</span>
        </YAxisSC>
        <BarsAreaSC
          onMouseDown={(e) => {
            const x = relativeX(e)
            setDrag({ startX: x, currentX: x })
          }}
          onMouseMove={(e) => {
            if (!drag) return
            setDrag({ ...drag, currentX: relativeX(e) })
          }}
          onMouseUp={(e) => {
            if (!drag) return
            const x = relativeX(e)
            const startIdx = xToIndex(Math.min(drag.startX, x))
            const endIdx = xToIndex(Math.max(drag.startX, x))
            if (Math.abs(drag.startX - x) > 3)
              onRangeSelect(bucketRange(startIdx, endIdx))
            setDrag(null)
          }}
          onMouseLeave={() => setDrag(null)}
        >
          <BarsRowSC ref={rowRef}>
            {selectionIndices && (
              <SelectionOverlaySC
                style={{
                  left: indexToX(selectionIndices.startIdx),
                  width:
                    indexToX(selectionIndices.endIdx + 1) -
                    indexToX(selectionIndices.startIdx),
                }}
              />
            )}
            {buckets.map((bucket) => {
              const scale = (count: number) =>
                (count / yMax) * CHART_CANVAS_HEIGHT
              const topLevel = [...STACK_ORDER]
                .reverse()
                .find((level) => bucket.levels[level] > 0)
              return (
                <BarStackSC key={bucket.timestamp.getTime()}>
                  {STACK_ORDER.map((level) => {
                    const count = bucket.levels[level]
                    if (!count) return null
                    return (
                      <BarSegmentSC
                        key={level}
                        $roundedTop={level === topLevel}
                        style={{
                          height: scale(count),
                          backgroundColor: theme.colors[logLevelToColor[level]],
                        }}
                      />
                    )
                  })}
                </BarStackSC>
              )
            })}
          </BarsRowSC>
        </BarsAreaSC>
      </ChartCanvasSC>
      <XAxisSC style={{ paddingLeft: Y_AXIS_WIDTH + theme.spacing.medium }}>
        {xTickIndices.map((i) => (
          <XTickSC
            key={i}
            style={{
              left: indexToX(i) + rowWidth / buckets.length / 2,
            }}
          >
            {formatChartAxisTime(buckets[i].timestamp, sinceSeconds)}
          </XTickSC>
        ))}
      </XAxisSC>
    </ChartWrapperSC>
  )
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
  flex: 1,
  minWidth: 0,
  height: '100%',
})

const BarSegmentSC = styled.div<{ $roundedTop: boolean }>(
  ({ $roundedTop }) => ({
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
