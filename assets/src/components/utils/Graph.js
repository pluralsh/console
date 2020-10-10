import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import moment from 'moment'

export function dateFormat(date) {
  return moment.unix(date).format('MM/DD h:mm:ss a')
}

export function Graph({data, yFormat}) {
  return (
    <ResponsiveLine
        data={data}
        curve='catmullRom'
        margin={{ top: 50, right: 110, bottom: 75, left: 70 }}
        areaOpacity={.5}
        useMesh
        enablePoints={false}
        animate={false}
        xScale={{type: 'point'}}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
        colors={{scheme: 'category10'}}
        yFormat={yFormat}
        xFormat={dateFormat}
        enableGridX={false}
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
          orient: 'bottom',
          tickSize: 5,
          tickPadding: 5,
          format: dateFormat,
          tickRotation: 45,
          legendOffset: 36,
          legendPosition: 'middle'
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