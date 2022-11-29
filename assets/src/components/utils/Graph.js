import { useContext, useMemo, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import moment from 'moment'
import { last } from 'lodash'
import { Box, Text, ThemeContext } from 'grommet'
import { semanticColors } from '@pluralsh/design-system/dist/theme/colors'
import { useColorMap } from 'utils/color'

export function dateFormat(date) {
  return moment(date).format('MM/DD h:mm:ss a')
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
      >{text}
      </Text>
    </Box>
  )
}

function SliceTooltip({ point: { serieColor, serieId, data } }) {
  return (
    <Box
      flex={false}
      background="white"
      pad={{ vertical: 'xsmall', horizontal: 'small' }}
      direction="row"
      gap="xsmall"
      align="center"
    >
      <Box
        width="10px"
        height="10px"
        background={serieColor}
      />
      <Text
        size="small"
        weight={500}
      >{serieId}
      </Text>
      <Text size="small">{'~>'} x:</Text>
      <Text
        size="small"
        weight="bold"
      >{data.xFormatted}
      </Text>
      <Text size="small">y:</Text>
      <Text
        size="small"
        weight="bold"
      >{data.yFormatted}
      </Text>
    </Box>
  )
}

export function Graph({ data, yFormat, tickRotation }) {
  const theme = useContext(ThemeContext)
  const colors = useColorMap(theme)
  const [selected, setSelected] = useState(null)
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
        top: 20, right: 50, bottom: 110, left: 65,
      }}
      activeLineWidth={4}
      lineWidth={1}
      enablePoints={false}
      enableArea
      areaOpacity={0.5}
      useMesh
      animate={false}
      xScale={{ type: 'time', format: 'native' }}
      yScale={{
        type: 'linear', min: 0, max: 'auto', stacked: true, reverse: false,
      }}
      colors={colors}
      yFormat={yFormat}
      xFormat={dateFormat}
      tooltip={SliceTooltip}
      axisLeft={{
        orient: 'left',
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
        tickRotation,
        tickSize: 0,
        orient: 'bottom',
        legendPosition: 'middle',
        legend: hasData ? `${dateFormat(data[0].data[0].x)} to ${dateFormat(last(data[0].data).x)}` : null,
        legendOffset: 90,
      }}
      pointLabel="y"
      pointLabelYOffset={-15}
      legends={[
        {
          anchor: 'bottom',
          onClick: ({ id }) => (selected ? setSelected(null) : setSelected(id)),
          direction: 'row',
          justify: false,
          translateX: 0,
          translateY: 70,
          itemsSpacing: 0,
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
      theme={{
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
      }}
    />
  )
}
