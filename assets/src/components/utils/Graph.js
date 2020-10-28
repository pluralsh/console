import React, { useContext } from 'react'
import { ResponsiveLine } from '@nivo/line'
import moment from 'moment'
import { last } from 'lodash'
import { ThemeContext, Text, Box } from 'grommet'
import { normalizeColor } from 'grommet/utils'

export function dateFormat(date) {
  return moment(date).format('MM/DD h:mm:ss a')
}

function SliceTooltip({point: {serieColor, serieId, data}}) {

  return (
    <Box flex={false} background='white' pad={{vertical: 'xsmall', horizontal: 'small'}}
         background='white'direction='row' gap='xsmall' align='center'>
      <Box width='10px' height='10px' background={serieColor} />
      <Text size='small' weight={500}>{serieId}</Text>
      <Text size='small'>~> x:</Text>
      <Text size='small' weight='bold'>{data.xFormatted}</Text>
      <Text size='small'>y:</Text>
      <Text size='small' weight='bold'>{data.yFormatted}</Text>
    </Box>
  )
}

export function Graph({data, yFormat, tick}) {
  const theme = useContext(ThemeContext)
  if (data.length === 0) return <Text size='small'>no data</Text>

  const hasData = !!data[0].data[0]
  return (
    <ResponsiveLine
        theme={{
          textColor: 'white',
          tooltip: {container: {color: '#13141a'}},
          crosshair: {line: {stroke: '#efef'}},
          legends: {text: {fill: 'white'}},
          axis: {legend: {text: {fill: 'white'}}},
          grid: {line: {stroke: normalizeColor('dark-2', theme)}},
        }}
        data={data}
        curve='catmullRom'
        margin={{top: 50, right: 110, bottom: 75, left: 70}}
        areaOpacity={.5}
        useMesh
        lineWidth='2px'
        enablePoints={false}
        // enableSlices='x'
        animate={false}
        xScale={{type: 'time', format: 'native'}}
        yScale={{type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false}}
        colors={{scheme: 'nivo'}}
        yFormat={yFormat}
        xFormat={dateFormat}
        tooltip={SliceTooltip}
        axisLeft={{
          orient: 'left',
          tickSize: 5,
          format: yFormat,
          tickPadding: 5,
          tickRotation: 0,
          legendOffset: -50,
          legendPosition: 'top'
        }}
        axisBottom={{
          format: '%H:%M',
          tickValues: tick || 'every 5 minutes',
          orient: 'bottom',
          legendPosition: 'middle',
          legend: hasData ? `${dateFormat(data[0].data[0].x)} to ${dateFormat(last(data[0].data).x)}` : null,
          legendOffset: 46,
        }}
        pointLabel="y"
        pointLabelYOffset={-15}
        legends={[
          {
              anchor: 'bottom-right',
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
                          itemOpacity: 1
                      }
                  }
              ]
          }
      ]} />
  )
}