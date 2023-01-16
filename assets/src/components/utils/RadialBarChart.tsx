// install (please make sure versions match peerDependencies)
// yarn add @nivo/core @nivo/radial-bar
import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { cpuFmt, roundToTwoPlaces } from 'components/cluster/utils'
import {
  ComponentProps,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Card, styledTheme as theme } from '@pluralsh/design-system'

import styled, { useTheme } from 'styled-components'

import { Div } from 'honorable'

import { createPortal } from 'react-dom'

import { CHART_THEME } from './charts'

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
  track: theme.colors['fill-two'],
} as const satisfies Record<string, string>

function BarChartTooltip({ color, category, value }) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')
  const [position, setPosition] = useState({ top: 0, left: 0 })
  // const mousePositionRef = useRef<unknown>()

  useEffect(() => {
    const parentNode = ref?.current?.parentElement

    if (!parentNode) {
      return
    }
    const parentRect = parentNode.getBoundingClientRect()

    setPosition({
      top: parentRect.x,
      left: parentRect.y,
    })
    setTransform(parentNode?.style?.transform)
    const observer = new MutationObserver(observed => {
      if (observed.findIndex(record => record.attributeName === 'style') >= 0) {
        setTransform(parentNode?.style?.transform)
        const parentRect = parentNode.getBoundingClientRect()

        setPosition({
          top: parentRect.x,
          left: parentRect.y,
        })
      }
    })

    observer.observe(parentNode, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  const content = (
    <Card
      display="flex"
      fillLevel={2}
      position="absolute"
      zIndex={100}
      {...position}
      paddingLeft={theme.spacing.xsmall}
      paddingRight={theme.spacing.xsmall}
      paddingBottom={theme.spacing.xxsmall}
      paddingTop={theme.spacing.xxsmall}
      flexDirection="row"
      alignItems="center"
      gap={theme.spacing.xsmall}
      caption
      pointerEvents="none"
      transition="transform 0.1s ease-out"
      style={{ transform }}
    >
      <Div
        width={12}
        height={12}
        backgroundColor={color}
        aria-hidden
      />
      <Div>
        {category}:{' '}
        {value}
      </Div>
    </Card>
  )

  return (
    <Div
      width="0"
      height="0"
      ref={ref as any}
    >
      {transform && createPortal(content, document.body)}
    </Div>
  )
}

function RadialBarChartUnstyled({
  data /* see data tab */,
  className,
  width,
  height,
  ...props
}: {
  className?: string
  width?: number
  height?: number
  data: ComponentProps<typeof ResponsiveRadialBar>['data']
} & Omit<Partial<ComponentProps<typeof ResponsiveRadialBar>>, 'data'>) {
  return (
    <Div
      className={`${className}`}
      height={height || 180}
      width={width || 180}
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
        valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
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
          <BarChartTooltip
            color={props.bar.color}
            value={props.bar.formattedValue}
            category={props.bar.category}
          />
        )}
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
