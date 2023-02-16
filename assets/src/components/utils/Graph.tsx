import {
  Key,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ResponsiveLine } from '@nivo/line'
import moment from 'moment'
import { last } from 'lodash'
import { Box, Text, ThemeContext } from 'grommet'
import { semanticColors } from '@pluralsh/design-system/dist/theme/colors'
import { Card } from '@pluralsh/design-system'
import { useColorMap } from 'utils/color'
import { Div, Flex, Span } from 'honorable'
import { DEFAULT_THEME } from 'theme'

export function dateFormat(date) {
  return moment(date).format('MM/DD h:mm:ss a')
}

const graphTheme = {
  ...DEFAULT_THEME,
  axis: {
    ticks: {
      text: {
        fill: semanticColors['text-xlight'],
      },
      line: {
        stroke: semanticColors.border,
      },
    },
    legend: {
      text: {
        fill: semanticColors['text-light'],
      },
    },
  },
  grid: {
    line: {
      stroke: semanticColors.border,
    },
  },
}

export function GraphHeader({ text }) {
  return (
    <Box
      direction="row"
      align="center"
      justify="center"
    >
      <Text
        size="small"
        weight="bold"
      >
        {text}
      </Text>
    </Box>
  )
}

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
  const theme = useContext(ThemeContext)
  const colors = useColorMap(theme)
  const [selected, setSelected] = useState<Key | null>(null)
  const graph = useMemo(() => {
    if (data.find(({ id }) => id === selected)) {
      return data.filter(({ id }) => id === selected)
    }

    return data
  }, [data, selected])

  if (graph.length === 0) return <Text size="small">no data</Text>

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
        stacked: true,
        reverse: false,
      }}
      colors={colors}
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
            /* @ts-expect-error */
          ? `${dateFormat(data[0].data[0].x)} — ${dateFormat(last(data?.[0]?.data).x)}`
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
          itemTextColor: semanticColors['text-xlight'],
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemTextColor: semanticColors['text-light'],
              },
            },
          ],
        },
      ]}
      theme={graphTheme}
    />
  )
}
