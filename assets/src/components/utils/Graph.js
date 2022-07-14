import { useContext, useMemo, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import moment from 'moment'
import { last } from 'lodash'
import { Box, Text, ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'

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
      <Text size="small">~> x:</Text>
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

export const COLOR_MAP = [
  'blue', 
  'orange', 
  'green', 
  'purple', 
  'red',

  'blue-light', 
  'orange-light', 
  'green-light', 
  'purple-light', 
  'red-light',
  
  'blue-dark', 
  'orange-dark', 
  'green-dark', 
  'purple-dark', 
  'red-dark',

  'blue-light-2', 
  'orange-light-2', 
  'green-light-2', 
  'purple-light-2', 
  'red-light-2',

  'blue-dark-2', 
  'orange-dark-2', 
  'green-dark-2', 
  'purple-dark-2', 
  'red-dark-2',
]

export function useColorMap(theme, colors) {
  return useMemo(() => (colors || COLOR_MAP).map(c => normalizeColor(c, theme)), [theme, colors])
}

export function Graph({ data, yFormat, tickRotation }) {
  const theme = useContext(ThemeContext)
  const colorMap = useColorMap(theme)
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
      theme={{
        textColor: 'white',
        tooltip: { container: { color: '#13141a' } },
        crosshair: { line: { stroke: '#efef' } },
        legends: { text: { fill: 'white' } },
        axis: { legend: { text: { fill: 'white' } } },
        grid: { line: { stroke: normalizeColor('dark-1', theme) } },
      }}
      data={graph}
        // curve='catmullRom'
      margin={{ top: 50, right: 110, bottom: 50, left: 70 }}
      areaOpacity={0.6}
      lineWidth={2}
      enableArea
      activeLineWidth={4}
      enablePoints={false}
      useMesh
        // enableSlices='x'
      animate={false}
        // enableGridX={false}
      xScale={{ type: 'time', format: 'native' }}
      yScale={{ type: 'linear', min: 0, max: 'auto', stacked: true, reverse: false }}
      colors={colorMap}
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
        tickSize: 0,
          // tickValues: tick || 'every 5 minutes',
        orient: 'bottom',
        tickRotation,
        legendPosition: 'middle',
        legend: hasData ? `${dateFormat(data[0].data[0].x)} to ${dateFormat(last(data[0].data).x)}` : null,
        legendOffset: 46,
      }}
      pointLabel="y"
      pointLabelYOffset={-15}
      legends={[
        {
          anchor: 'bottom-right',
          onClick: ({ id }) => selected ? setSelected(null) : setSelected(id),
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 20,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
          symbolBorderColor: 'rgba(0, 0, 0, .5)',
          itemTextColor: 'white',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemOpacity: 1,
              },
            },
          ],
        },
      ]}
    />
  )
}
