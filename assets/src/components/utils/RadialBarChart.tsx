// install (please make sure versions match peerDependencies)
// yarn add @nivo/core @nivo/radial-bar
import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { cpuFmt, roundToTwoPlaces } from 'components/cluster/utils'
import { ComponentProps } from 'react'

const defaultData = {
  id: 'Supermarket',
  data: [
    {
      x: 'Limits',
      y: 107,
    },
    {
      x: 'Requests',
      y: 30,
    },
    {
      x: 'Used',
      y: 277,
    },
    {
      x: 'Available',
      y: 555,
    },
  ],
}

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
// website examples showcase many properties,
// you'll often use just a few of them.

const COLOR_MAP = {
  blue: '#99DAFF',
  orange: '#D596F4',
  green: '#99F5D5',
  purple: '#9FA3F9',
  red: '#F599A8',

  'blue-light': '#C2E9FF',
  'orange-light': '#E7C3F9',
  'green-light': '#C7FAE8',
  'purple-light': '#CFD1FC',
  'red-light': '#FAC7D0',

  'blue-dark': '#4DBEFF',
  'orange-dark': '#B747EB',
  'green-dark': '#3CECAF',
  'purple-dark': '#3CECAF',
  'red-dark': '#E95374',

  'blue-light-2': '#C2F0FF',
  'orange-light-2': '#D1C3F9',
  'green-light-2': '#C8FAC7',
  'purple-light-2': '#CFECFC',
  'red-light-2': '#FAEFC7',

  'blue-dark-2': '#FAEFC7',
  'orange-dark-2': '#AE95F4',
  'green-dark-2': '#95F593',
  'purple-dark-2': '#9FD9F9',
  'red-dark-2': '#F5E093',
}

const chartColors = {
  used: COLOR_MAP.red,
  available: COLOR_MAP.green,
  requests: COLOR_MAP.orange,
  limits: COLOR_MAP.blue,
} as const satisfies Record<string, string>

export default function RadialBarChart({
  data /* see data tab */,
  ...props
}: Partial<ComponentProps<typeof ResponsiveRadialBar>>) {
  return (
    <ResponsiveRadialBar
      colors={[
        chartColors.requests,
        chartColors.limits,
        chartColors.used,
        chartColors.available,
      ]}
      data={data || defaultData}
      valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
      padding={0.4}
      cornerRadius={2}
      margin={{
        top: 40,
        right: 120,
        bottom: 40,
        left: 40,
      }}
      radialAxisStart={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
      circularAxisOuter={{ tickSize: 5, tickPadding: 12, tickRotation: 0 }}
      legends={[
        {
          anchor: 'right',
          direction: 'column',
          justify: false,
          translateX: 80,
          translateY: 0,
          itemsSpacing: 6,
          itemDirection: 'left-to-right',
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: '#999',
          symbolSize: 18,
          symbolShape: 'square',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#000',
              },
            },
          ],
        },
      ]}
      {...props}
    />
  )
}
