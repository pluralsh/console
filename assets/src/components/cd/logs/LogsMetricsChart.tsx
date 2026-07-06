import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { LogLevel, logLevelToColor } from './LogLine'
import {
  bucketTimeRange,
  CHART_BAR_GAP,
  CHART_CANVAS_HEIGHT,
  chartTickIndices,
  chartYMax,
  formatChartAxisTime,
  formatCompactCount,
  formatRangeTime,
  indexToBucketX,
  LOG_LEVEL_SELECTION_EDGE,
  LOG_LEVEL_SELECTION_SHADOW,
  LogsTimeRange,
  rangeBucketIndices,
  StackedBucket,
  xToBucketIndex,
} from './logsMetricsUtils'
import { useLogsChartBuckets } from './useLogsChartBuckets'

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

  const { buckets, bucketMs, initialLoading } = useLogsChartBuckets({
    clusterId,
    serviceId,
    query,
    time,
    operator,
    facets,
    sinceSeconds,
    pollInterval,
  })

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

  const toX = (index: number) => indexToBucketX(index, rowWidth, bucketCount)
  const toIndex = (x: number) => xToBucketIndex(x, rowWidth, bucketCount)

  const rangeIndices = useMemo(
    () => rangeBucketIndices(buckets, rangeFilter, bucketMs),
    [buckets, rangeFilter, bucketMs]
  )

  const dragIndices = drag
    ? {
        startIdx: toIndex(Math.min(drag.startX, drag.currentX)),
        endIdx: toIndex(Math.max(drag.startX, drag.currentX)),
      }
    : null

  const selectionIndices = dragIndices ?? rangeIndices

  const selectionBounds = selectionIndices
    ? {
        left: toX(selectionIndices.startIdx),
        width:
          toX(selectionIndices.endIdx + 1) - toX(selectionIndices.startIdx),
      }
    : null

  const dragPreview =
    drag && dragIndices && buckets.length
      ? bucketTimeRange(
          buckets,
          dragIndices.startIdx,
          dragIndices.endIdx,
          bucketMs
        )
      : null

  const relativeX = (e: React.MouseEvent<HTMLDivElement>) =>
    e.clientX - e.currentTarget.getBoundingClientRect().left

  if (initialLoading) {
    return (
      <ChartWrapperSC>
        <RectangleSkeleton
          $height={CHART_CANVAS_HEIGHT + X_AXIS_HEIGHT + CHART_PADDING_BOTTOM}
          $width="100%"
        />
      </ChartWrapperSC>
    )
  }

  if (isEmpty(buckets)) return null

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
            const startIdx = toIndex(Math.min(drag.startX, x))
            const endIdx = toIndex(Math.max(drag.startX, x))
            if (Math.abs(drag.startX - x) > 3)
              onRangeSelect(
                bucketTimeRange(buckets, startIdx, endIdx, bucketMs)
              )
            setDrag(null)
          }}
          onMouseLeave={() => setDrag(null)}
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
              <ChartBarStack
                key={bucket.timestamp.getTime()}
                bucket={bucket}
                yMax={yMax}
              />
            ))}
          </BarsRowSC>
          {dragPreview && selectionBounds && (
            <DragTooltipSC
              style={{
                left: selectionBounds.left + selectionBounds.width / 2,
              }}
            >
              {formatRangeTime(dragPreview.start)} –{' '}
              {formatRangeTime(dragPreview.end)}
            </DragTooltipSC>
          )}
        </BarsAreaSC>
      </ChartCanvasSC>
      <XAxisSC style={{ paddingLeft: Y_AXIS_WIDTH + theme.spacing.medium }}>
        {chartTickIndices(bucketCount).map((i) => (
          <XTickSC
            key={i}
            style={{ left: toX(i) + rowWidth / bucketCount / 2 }}
          >
            {formatChartAxisTime(buckets[i].timestamp, sinceSeconds)}
          </XTickSC>
        ))}
      </XAxisSC>
    </ChartWrapperSC>
  )
}

function ChartBarStack({
  bucket,
  yMax,
}: {
  bucket: StackedBucket
  yMax: number
}) {
  const { colors } = useTheme()
  const scale = (count: number) => (count / yMax) * CHART_CANVAS_HEIGHT
  const topLevel = STACK_ORDER.findLast((level) => bucket.levels[level] > 0)

  return (
    <BarStackSC>
      {STACK_ORDER.map((level) => {
        const count = bucket.levels[level]
        if (!count) return null
        return (
          <BarSegmentSC
            key={level}
            $roundedTop={level === topLevel}
            style={{
              height: scale(count),
              backgroundColor: colors[logLevelToColor[level]],
            }}
          />
        )
      })}
    </BarStackSC>
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

const DragTooltipSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  transform: 'translate(-50%, -100%)',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  border: theme.borders['on-fill-two'],
  ...theme.partials.text.caption,
  color: theme.colors.text,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  zIndex: 3,
}))

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
