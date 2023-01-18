// install (please make sure versions match peerDependencies)
// yarn add @nivo/core @nivo/radial-bar
import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { ComponentProps, useMemo } from 'react'

import styled, { useTheme } from 'styled-components'

import { Div } from 'honorable'

import { CHART_THEME } from './charts'
import { ChartTooltip } from './ChartTooltip'

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
  track: 'transparent',
} as const satisfies Record<string, string>

export const createCenteredMetric = (val, label, { fontSize = 25 } = {}) => function CenteredMetric({ center }: any) {
  const theme = useTheme()
  const percentFontSize = fontSize * 0.85
  let showPercent = false
  let displayVal = typeof val === 'string' ? val.trim() : ''

  if (displayVal[displayVal.length - 1] === '%') {
    showPercent = true
    displayVal = displayVal.substring(0, displayVal.length - 1)
  }

  return (
    <g transform={`translate(${center[0]},${center[1] + 3})`}>
      <text
        fill={theme.colors['text-light']}
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="alphabetic"
        style={{ ...theme.partials.text.h4, display: 'block', fontSize: 27 }}
      >
        {displayVal}
        {showPercent && <tspan fontSize={percentFontSize}>%</tspan>}
      </text>
      <text
        fill={theme.colors['text-xlight']}
        x="0"
        y="3"
        textAnchor="middle"
        dominantBaseline="hanging"
        style={{
          ...theme.partials.text.overline,
          display: 'block',
          fontSize: 10,
        }}
      >
        {label}
      </text>
    </g>
  )
}

function RadialBarChartUnstyled({
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
  centerVal?: string
  centerLabel?: string
  data: ComponentProps<typeof ResponsiveRadialBar>['data']
} & Omit<Partial<ComponentProps<typeof ResponsiveRadialBar>>, 'data'>) {
  const CenteredMetric = useMemo(() => (true ? createCenteredMetric(centerVal, centerLabel) : () => null),
    [centerLabel, centerVal])

  return (
    <Div
      className={`${className}`}
      width={width ?? 180}
      height={height ?? 180}
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
        theme={CHART_THEME}
        enableCircularGrid={false}
        enableRadialGrid
        tooltip={props => (
          <ChartTooltip
            color={props.bar.color}
            value={props.bar.formattedValue}
            label={props.bar.category}
          />
        )}
        layers={['grid', 'bars', CenteredMetric]}
        {...props}
      />
    </Div>
  )
}

const RadialBarChart = styled(RadialBarChartUnstyled)(_ => ({
  // Hide radial tick labels without hiding bar labels
  'text[text-anchor="middle"]': {
    display: 'none',
  },
}))

export default RadialBarChart
