import { ResponsiveLine } from '@nivo/line'
import { Card } from '@pluralsh/design-system'
import { Flex, Span } from 'honorable'
import { last } from 'lodash'
import moment from 'moment'
import { Key, useMemo, useState } from 'react'
import { DefaultTheme, useTheme } from 'styled-components'
import { DEFAULT_THEME } from 'theme'
import { COLORS } from 'utils/color'

export function dateFormat(date) {
  return moment(date).format('MM/DD h:mm:ss a')
}

const graphTheme = (theme: DefaultTheme) => ({
  ...DEFAULT_THEME,
  axis: {
    ticks: {
      text: {
        fill: theme.colors['text-xlight'],
      },
      line: {
        stroke: theme.colors.border,
      },
    },
    legend: {
      text: {
        fill: theme.colors['text-light'],
      },
    },
  },
  grid: {
    line: {
      stroke: theme.colors.border,
    },
  },
})

function SliceTooltip({ point: { serieColor, serieId, data } }) {
  return (
    <Card
      display="flex"
      alignItems="center"
      fillLevel={2}
      paddingVertical="xxsmall"
      paddingHorizontal="xsmall"
      direction="row"
      gap="xsmall"
      caption
    >
      <Flex
        width={12}
        height={12}
        backgroundColor={serieColor}
      />
      <div>
        {serieId}: <Span style={{ fontWeight: 700 }}>{data.yFormatted}</Span>
        <br />
        {data.xFormatted}
      </div>
    </Card>
  )
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
  const theme = useTheme()
  const [selected, setSelected] = useState<Key | null>(null)
  const graph = useMemo(() => {
    if (data.find(({ id }) => id === selected)) {
      return data.filter(({ id }) => id === selected)
    }

    return data
  }, [data, selected])

  if (graph.length === 0)
    return <Span css={theme.partials.text.caption}>no data</Span>

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
          itemTextColor: theme.colors['text-xlight'],
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemTextColor: theme.colors['text-light'],
              },
            },
          ],
        },
      ]}
      theme={graphTheme(theme)}
    />
  )
}
