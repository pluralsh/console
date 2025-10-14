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
}: {
  data: any
  yFormat: any
  tickRotation?: number
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

  return (
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
        legend: hasData
          ? `${dateFormat(data[0].data[0].x)} — ${dateFormat(
              /* @ts-expect-error */
              last(data?.[0]?.data).x
            )}`
          : null,
        legendOffset: 70,
        legendPosition: 'middle',
      }}
      pointLabel="y"
      pointLabelYOffset={-15}
      legends={[
        {
          anchor: 'bottom',
          onClick: ({ id }) => (selected ? setSelected(null) : setSelected(id)),
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
      ]}
      theme={graphTheme}
    />
  )
}
