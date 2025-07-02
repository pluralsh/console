// install (please make sure versions match peerDependencies)
// yarn add @nivo/core @nivo/radial-bar
import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { ComponentProps, useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { useChartTheme } from './charts'
import { ChartTooltip } from './ChartTooltip'
import { SemanticColorKey } from '@pluralsh/design-system'

export const CHART_COLOR_MAP = {
  blue: '#99DAFF',
  orange: '#D596F4',
  green: '#6AF1C2',
  purple: '#9FA3F9',
  red: '#F599A8',
  yellow: '#FFF59E',

  'yellow-light': '#FFF9C2',
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
  used: CHART_COLOR_MAP.red,
  available: CHART_COLOR_MAP.green,
  requests: CHART_COLOR_MAP.orange,
  limits: CHART_COLOR_MAP.blue,
  track: 'transparent',
} as const satisfies Record<string, string>

export const createCenteredMetric = (
  val: Nullable<string | number>,
  label: Nullable<string | number>,
  color: SemanticColorKey = 'text',
  secondaryColor: SemanticColorKey = 'text-light'
) =>
  function CenteredMetric({ center }: any) {
    const fontSize = 25
    const theme = useTheme()
    const percentFontSize = fontSize * 0.85
    let showPercent = false
    let displayVal = typeof val === 'string' ? val.trim() : ''

    if (displayVal[displayVal.length - 1] === '%') {
      showPercent = true
      displayVal = displayVal.substring(0, displayVal.length - 1)
    }

    return (
      <g transform={`translate(${center[0]},${center[1] + 1})`}>
        <text
          fill={theme.colors[color]}
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="alphabetic"
          style={{
            fontFamily: 'Monument Semi-Mono',
            fontSize: 26,
            fontStyle: 'normal',
            fontWeight: 500,
          }}
        >
          {displayVal}
          {showPercent && <tspan fontSize={percentFontSize}>%</tspan>}
        </text>
        <text
          fill={theme.colors[secondaryColor]}
          x="0"
          y="5.5"
          textAnchor="middle"
          dominantBaseline="hanging"
          style={{
            ...theme.partials.text.body2,
            fontSize: 12,
          }}
        >
          {label}
        </text>
      </g>
    )
  }

const RadialBarChartSC = styled.div<{ $width: number; $height: number }>(
  ({ $width, $height }) => ({
    width: $width,
    height: $height,
    // Hide radial tick labels without hiding bar labels
    'text[text-anchor="middle"]': {
      display: 'none',
    },
  })
)

function RadialBarChart({
  data /* see data tab */,
  className,
  width,
  height,
  centerVal,
  centerLabel,
  ...props
}: {
  className?: string
  width?: number
  height?: number
  centerVal?: Nullable<string | number>
  centerLabel?: Nullable<string | number>
  data: ComponentProps<typeof ResponsiveRadialBar>['data']
} & Omit<Partial<ComponentProps<typeof ResponsiveRadialBar>>, 'data'>) {
  const chartTheme = useChartTheme()
  const CenteredMetric = useMemo(
    () => createCenteredMetric(centerVal, centerLabel),
    [centerLabel, centerVal]
  )

  return (
    <RadialBarChartSC
      className={`${className}`}
      $width={width ?? 180}
      $height={height ?? 180}
    >
      <ResponsiveRadialBar
        colors={[
          chartColors.used,
          chartColors.available,
          chartColors.requests,
          chartColors.limits,
        ]}
        tracksColor={chartColors.track}
        data={data}
        padding={0.3}
        innerRadius={0.5}
        cornerRadius={0}
        margin={{
          top: 0,
          right: 7,
          bottom: 0,
          left: 7,
        }}
        radialAxisStart={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
        circularAxisOuter={{ tickSize: 0, tickPadding: 12, tickRotation: 0 }}
        theme={chartTheme}
        enableCircularGrid={false}
        enableRadialGrid
        tooltip={(props) => (
          <ChartTooltip
            color={props.bar.color}
            value={props.bar.formattedValue}
            label={props.bar.category}
          />
        )}
        layers={['grid', 'bars', CenteredMetric]}
        {...props}
      />
    </RadialBarChartSC>
  )
}

export default RadialBarChart
