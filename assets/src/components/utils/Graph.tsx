import { ResponsiveLine } from '@nivo/line'
import { type PartialTheme as NivoThemeType } from '@nivo/theming'
import dayjs from 'dayjs'
import { last } from 'lodash'
import { Key, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import { SliceTooltip } from './ChartTooltip'
import { CaptionP } from './typography/Text'

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

export function Graph({
  data,
  yFormat,
  tickRotation,
  wrapLegend,
}: {
  data: any
  yFormat: any
  tickRotation?: number
  wrapLegend?: boolean
}) {
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()
  const [selected, setSelected] = useState<Key | null>(null)
  const graph = useMemo(() => {
    if (data.find(({ id }) => id === selected)) {
      return data.filter(({ id }) => id === selected)
    }

    return data
  }, [data, selected])

  if (graph.length === 0) return <CaptionP>no data</CaptionP>

  const hasData = !!graph[0].data[0]
  const timeRange = hasData
    ? `${dateFormat(data[0].data[0].x)} — ${dateFormat(
        /* @ts-expect-error */
        last(data?.[0]?.data).x
      )}`
    : null
  const toggleSelected = (id: Key) => setSelected(selected ? null : id)
  const line = (
    <ResponsiveLine
      data={graph}
      margin={{
        top: 20,
        right: 20,
        bottom: 100,
        left: 50,
      }}
      lineWidth={1}
      enablePoints={false}
      enableArea
      areaOpacity={0.05}
      useMesh
      animate
      xScale={{ type: 'time', format: 'native' }}
      yScale={{
        type: 'linear',
        min: 0,
        max: 'auto',
        stacked: false,
        reverse: false,
      }}
      colors={COLORS}
      yFormat={yFormat}
      xFormat={dateFormat}
      tooltip={SliceTooltip}
      axisLeft={{
        tickSize: 0,
        format: yFormat,
        tickPadding: 5,
        tickRotation: 0,
        legendOffset: -50,
        legendPosition: 'start',
      }}
      axisBottom={{
        format: '%H:%M',
        tickPadding: 10,
        tickRotation: tickRotation || 45,
        tickSize: 0,
        legend: wrapLegend ? null : timeRange,
        legendOffset: 70,
        legendPosition: 'middle',
      }}
      pointLabel="y"
      pointLabelYOffset={-15}
      legends={
        wrapLegend
          ? []
          : [
              {
                anchor: 'bottom',
                onClick: ({ id }) => toggleSelected(id),
                direction: 'row',
                justify: false,
                translateY: 56,
                itemsSpacing: 10,
                itemDirection: 'left-to-right',
                itemWidth: 100,
                itemHeight: 20,
                symbolSize: 12,
                symbolShape: 'circle',
                itemTextColor: colors['text-xlight'],
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemBackground: 'rgba(0, 0, 0, .03)',
                      itemTextColor: colors['text-light'],
                    },
                  },
                ],
              },
            ]
      }
      theme={graphTheme}
    />
  )

  if (!wrapLegend) return line

  return (
    <div css={{ height: '100%', position: 'relative', width: '100%' }}>
      {line}
      {timeRange && (
        <div
          css={{
            bottom: 46,
            color: colors['text-light'],
            fontSize: 11,
            left: 50,
            lineHeight: '16px',
            pointerEvents: 'none',
            position: 'absolute',
            right: 20,
            textAlign: 'center',
          }}
        >
          {timeRange}
        </div>
      )}
      <div
        css={{
          bottom: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 10px',
          left: 50,
          maxHeight: 42,
          overflowY: 'auto',
          position: 'absolute',
          right: 20,
        }}
      >
        {data.map(({ id }, index) => {
          const isSelected = selected === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleSelected(id)}
              css={{
                all: 'unset',
                alignItems: 'center',
                borderRadius: 4,
                color: colors['text-xlight'],
                cursor: 'pointer',
                display: 'flex',
                gap: 6,
                lineHeight: '16px',
                maxWidth: '100%',
                minWidth: 0,
                opacity: selected && !isSelected ? 0.45 : 1,
                padding: '2px 4px',
                '&:hover': {
                  background: 'rgba(0, 0, 0, .03)',
                  color: colors['text-light'],
                },
              }}
            >
              <span
                css={{
                  background: isSelected
                    ? COLORS[0]
                    : COLORS[index % COLORS.length],
                  borderRadius: '50%',
                  flex: '0 0 12px',
                  height: 12,
                  width: 12,
                }}
              />
              <span css={{ minWidth: 0, overflowWrap: 'anywhere' }}>{id}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
