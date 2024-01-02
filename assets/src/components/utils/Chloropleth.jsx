import { useTheme } from 'styled-components'
import { ResponsiveChoropleth } from '@nivo/geo'
import { max } from 'lodash'

import { ChartTooltip } from './ChartTooltip'

import countries from './world_countries.json'

function Tooltip({ feature }) {
  if (!feature.data) return null
  const { id, value } = feature.data

  return (
    <ChartTooltip
      color={feature.color}
      label={id}
      value={value}
    >
      {id} {value}
    </ChartTooltip>
  )
}

export function Chloropleth({ data }) {
  const maximum = max(data.map(({ value }) => value))
  const styledTheme = useTheme()
  const colors = [
    styledTheme.colors.blue[400],
    styledTheme.colors.blue[500],
    styledTheme.colors.blue[600],
    styledTheme.colors.blue[700],
    styledTheme.colors.blue[800],
  ]

  return (
    <ResponsiveChoropleth
      data={data}
      theme={{ textColor: styledTheme.colors.text }}
      features={countries.features}
      label="properties.name"
      valueFormat=".2s"
      domain={[0, maximum + 1]}
      colors={colors}
      unknownColor={styledTheme.colors['fill-two']}
      enableGraticule
      graticuleLineColor={styledTheme.colors.border}
      borderWidth={0.5}
      isInteractive
      borderColor={styledTheme.colors['border-fill-two']}
      projectionType="naturalEarth1"
      tooltip={Tooltip}
      legends={[
        {
          anchor: 'bottom-left',
          direction: 'column',
          justify: true,
          translateX: 48,
          translateY: -48,
          itemsSpacing: 0,
          itemWidth: 94,
          itemHeight: 18,
          itemDirection: 'left-to-right',
          itemOpacity: 0.85,
          symbolSize: 18,
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#fff',
                itemOpacity: 1,
              },
            },
          ],
        },
      ]}
    />
  )
}
