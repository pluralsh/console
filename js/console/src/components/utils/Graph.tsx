import {
  ResponsiveLine,
  type LineCustomSvgLayerProps,
  type LineSvgProps,
} from '@nivo/line'
import { type PartialTheme as NivoThemeType } from '@nivo/theming'
import dayjs from 'dayjs'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import { niceAxis, seriesExtent, type TickBase } from './axisTicks'
import { SliceTooltip } from './ChartTooltip'
import { ChartRangeSelect } from './timerange/ChartRangeSelect'
import type { TimeWindow } from './timerange/timeRange'
import { niceTimeTicks } from './timeTicks'
import { CaptionP } from './typography/Text'
import { GraphLegend } from './GraphLegend'

export type GraphSeries = {
  id: string
  data: { x: Date; y: number }[]
  dashed?: boolean
}

type GraphMarkers = LineSvgProps<GraphSeries>['markers']

function AreasWithoutDashedSeries({
  areaBlendMode,
  areaGenerator,
  areaOpacity,
  series,
}: LineCustomSvgLayerProps<GraphSeries>) {
  return (
    <g>
      {series
        .filter(({ dashed }) => !dashed)
        .map(({ color, data, id }) => (
          <path
            key={id}
            d={areaGenerator(data.map(({ position }) => position)) ?? undefined}
            fill={color}
            fillOpacity={areaOpacity}
            style={{ mixBlendMode: areaBlendMode }}
          />
        ))}
    </g>
  )
}

function StyledLines({
  lineGenerator,
  lineWidth,
  series,
}: LineCustomSvgLayerProps<GraphSeries>) {
  return (
    <g>
      {series.map(({ color, dashed, data, id }) => (
        <path
          key={id}
          d={lineGenerator(data.map(({ position }) => position)) ?? undefined}
          fill="none"
          stroke={color}
          strokeDasharray={dashed ? '6 4' : undefined}
          strokeWidth={lineWidth}
        />
      ))}
    </g>
  )
}

export function dateFormat(date) {
  return dayjs(date).format('MM/DD h:mm:ss a')
}

export function useGraphTheme(): NivoThemeType {
  const { colors } = useTheme()
  return {
    legends: {
      text: { fill: colors['text-light'] },
      title: { text: { fill: colors['text-light'] } },
      ticks: {
        text: { fill: colors['text-xlight'] },
        line: { stroke: colors['text-xlight'] },
      },
    },
    axis: {
      ticks: {
        text: { fill: colors['text-xlight'] },
        line: { stroke: colors['text-xlight'] },
      },
      legend: {
        text: { fill: colors['text-light'] },
      },
    },
    grid: { line: { stroke: colors.border } },
    crosshair: { line: { stroke: colors['border-fill-three'] } },
  }
}

const GRAPH_MARGIN = { top: 20, right: 20, bottom: 30, left: 50 } as const

function useElementWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])

  return [setEl, width] as const
}

function dataWindow(series: GraphSeries[]): TimeWindow | null {
  let start = Infinity
  let end = -Infinity
  for (const { data } of series) {
    for (const { x } of data) {
      const t = x.getTime()
      if (t < start) start = t
      if (t > end) end = t
    }
  }
  return Number.isFinite(start)
    ? { start: new Date(start), end: new Date(end) }
    : null
}

export function Graph({
  data,
  yFormat,
  timeWindow,
  onRangeSelect,
  markers,
  yTickBase = 'decimal',
}: {
  data: GraphSeries[]
  yFormat: any
  /** Aligns y ticks to binary (bytes) or clock (seconds) steps. */
  yTickBase?: TickBase
  /** Pins the x axis to this window instead of the data's extent. */
  timeWindow?: TimeWindow
  /** Enables drag-to-select on the plot; requires `timeWindow`. */
  onRangeSelect?: (start: Date, end: Date) => void
  /** Reference lines (e.g. alert thresholds); y markers are kept in view. */
  markers?: GraphMarkers
}) {
  const graphTheme = useGraphTheme()
  const [selected, setSelected] = useState<string | null>(null)
  const graph = useMemo(() => {
    if (data.find(({ id }) => id === selected)) {
      return data.filter(({ id }) => id === selected)
    }

    return data
  }, [data, selected])
  const yAxis = useMemo(() => {
    const { min, max } = seriesExtent([
      ...graph.flatMap(({ data }) => data.map(({ y }) => y)),
      ...(markers ?? []).filter(({ axis }) => axis === 'y').map((m) => m.value),
    ])
    return niceAxis(min, max, { base: yTickBase })
  }, [graph, markers, yTickBase])
  const [plotRef, chartWidth] = useElementWidth<HTMLDivElement>()
  const xAxis = useMemo(() => {
    const window = timeWindow ?? dataWindow(graph)
    if (!window) return null
    return niceTimeTicks(
      window.start,
      window.end,
      chartWidth - GRAPH_MARGIN.left - GRAPH_MARGIN.right,
      { overhangPx: { left: GRAPH_MARGIN.left, right: GRAPH_MARGIN.right } }
    )
  }, [chartWidth, graph, timeWindow])

  if (graph.length === 0) return <CaptionP>no data</CaptionP>

  const toggleSelected = (id: string) => setSelected(selected ? null : id)
  const hasDashedSeries = graph.some(({ dashed }) => dashed)
  const chart = (
    <ResponsiveLine
      data={graph}
      margin={GRAPH_MARGIN}
      lineWidth={1}
      enablePoints={false}
      enableArea
      areaOpacity={0.05}
      useMesh
      animate={!timeWindow}
      xScale={{
        type: 'time',
        format: 'native',
        ...(timeWindow && { min: timeWindow.start, max: timeWindow.end }),
      }}
      yScale={{
        type: 'linear',
        min: yAxis.min,
        max: yAxis.max,
        stacked: false,
        reverse: false,
      }}
      gridYValues={yAxis.ticks}
      colors={COLORS}
      yFormat={yFormat}
      xFormat={dateFormat}
      tooltip={SliceTooltip}
      markers={markers}
      layers={
        hasDashedSeries
          ? [
              'grid',
              'markers',
              'axes',
              AreasWithoutDashedSeries,
              'crosshair',
              StyledLines,
              'points',
              'slices',
              'mesh',
            ]
          : [
              'grid',
              'markers',
              'axes',
              'areas',
              'crosshair',
              'lines',
              'points',
              'slices',
              'mesh',
            ]
      }
      axisLeft={{
        tickSize: 0,
        tickValues: yAxis.ticks,
        format: yFormat,
        tickPadding: 5,
        tickRotation: 0,
      }}
      gridXValues={xAxis?.ticks}
      axisBottom={{
        format: xAxis?.format ?? '%H:%M',
        tickValues: xAxis?.ticks ?? 0,
        tickPadding: 8,
        tickRotation: 0,
        tickSize: 0,
      }}
      theme={graphTheme}
    />
  )

  return (
    <div
      css={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
      }}
    >
      <div css={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div
          ref={plotRef}
          css={{ inset: 0, position: 'absolute' }}
        >
          {timeWindow && onRangeSelect ? (
            <ChartRangeSelect
              timeWindow={timeWindow}
              margin={GRAPH_MARGIN}
              onRangeSelect={onRangeSelect}
              style={{ height: '100%' }}
            >
              {chart}
            </ChartRangeSelect>
          ) : (
            chart
          )}
        </div>
      </div>
      <GraphLegend
        items={data.map(({ dashed, id }, index) => ({
          id,
          label: id,
          dashed,
          color: selected === id ? COLORS[0] : COLORS[index % COLORS.length],
        }))}
        selectedId={selected}
        onSelect={toggleSelected}
        maxHeight={42}
        style={{
          paddingLeft: GRAPH_MARGIN.left,
          paddingRight: GRAPH_MARGIN.right,
        }}
      />
    </div>
  )
}
