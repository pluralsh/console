import { ComponentProps, ReactNode, useMemo } from 'react'
import { filesize } from 'filesize'
import { PieChart } from 'components/utils/PieChart'
import styled, { useTheme } from 'styled-components'

import { Flex, FlexProps } from 'honorable'

import RadialBarChart from 'components/utils/RadialBarChart'

import { cpuFmt, roundToTwoPlaces } from './utils'

const ChartHeading = styled.h3(({ theme }) => ({
  ...theme.partials.text.caption,
  textAlign: 'center',
}))

export function GaugeWrap({
  children,
  heading,
  width,
  height,
  ...props
}: Omit<FlexProps, 'heading'> & { heading: ReactNode }) {
  return (
    <Flex
      flexDirection="column"
      justifyContent="space-between"
      overflow="visible"
      {...props}
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
        width={height ?? 170}
        height={width ?? 170}
      >
        {children}
      </Flex>
      <ChartHeading>{heading}</ChartHeading>
    </Flex>
  )
}

const createCenteredMetric = ratio => function CenteredMetric({ centerX, centerY }: any) {
  const theme = useTheme()

  const percent = `${Math.round(ratio * 100)}%`

  return (
    <text
      fill={theme.colors['text-xlight']}
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ ...theme.partials.text.h4, fontSize: 25 }}
    >
      {percent}
    </text>
  )
}

export function UsageGauge({
  title,
  used,
  remainder,
  usedLabel,
  remainderLabel,
  ...props
}: {
  title: string
  used?: number
  remainder?: number
  usedLabel: string
  remainderLabel: string
} & Omit<ComponentProps<typeof PieChart>, 'data'>) {
  const centeredMetric = useMemo(() => (used && remainder
    ? createCenteredMetric(used / (used + remainder))
    : () => null),
  [remainder, used])
  const theme = useTheme()

  const chartColors = {
    used: theme.colors['text-danger-light'],
    available: theme.colors['icon-success'],
  } as const satisfies Record<string, string>

  return (
    <GaugeWrap heading={title}>
      <PieChart
        data={[
          ...(used
            ? [
              {
                id: usedLabel,
                value: used,
                color: chartColors.used,
              },
            ]
            : []),
          ...(remainder
            ? [
              {
                id: remainderLabel,
                value: remainder,
                color: chartColors.available,
              },
            ]
            : []),
        ]}
        layers={['arcs', centeredMetric]}
        {...props}
      />
    </GaugeWrap>
  )
}

export function ResourceGauge({
  requests = 0,
  limits = 0,
  used = 0,
  total = 0,
  type,
  ...props
}: {
  requests?: number
  limits?: number
  used?: number
  total?: number
  type: 'CPU' | 'Memory'
}) {
  const label = type
  const data = useMemo(() => [
    {
      id: `${label} usage`,
      data: [
        {
          x: `${label} used`,
          y: used,
        },
        {
          x: `${label} available`,
          y: total - used,
        },
      ],
    },
    {
      id: `${label} limits`,
      data: [
        {
          x: `${label} limits`,
          y: limits,
        },
      ],
    },
    {
      id: `${label} requests`,
      data: [
        {
          x: `${label} requests`,
          y: requests,
        },
      ],
    },
  ], [label, limits, requests, total, used])

  return (
    <RadialBarChart
      data={data}
      {...props}
    />
  )
}

export function CpuUsageGauge(props: { used?: number; remainder?: number }) {
  return (
    <UsageGauge
      title="CPU Utilization"
      valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
      usedLabel="CPU used"
      remainderLabel="CPU available"
      {...props}
    />
  )
}

export function CpuReservationGauge({
  requests,
  remainder,
  ...props
}: {
  requests?: number
  remainder?: number
  remainderLabel?: string
  usedLabel?: string
  title?: string
}) {
  return (
    <UsageGauge
      title="CPU Reservation"
      valueFormat={val => cpuFmt(roundToTwoPlaces(val))}
      usedLabel="CPU requests"
      remainderLabel="CPU remaining limits"
      used={requests}
      remainder={remainder}
      {...props}
    />
  )
}

export function MemoryUsageGauge(props: { used?: number; remainder?: number }) {
  return (
    <UsageGauge
      title="Memory Utilization"
      valueFormat={val => filesize(roundToTwoPlaces(val)) as string}
      usedLabel="Memory used"
      remainderLabel="Memory available"
      {...props}
    />
  )
}

export function MemoryReservationGauge({
  requests,
  remainder,
  ...props
}: {
  requests?: number
  remainder?: number
}) {
  return (
    <UsageGauge
      title="Memory Reservation"
      valueFormat={val => filesize(roundToTwoPlaces(val)) as string}
      usedLabel="Memory requests"
      remainderLabel="Memory remaining limits"
      used={requests}
      remainder={remainder}
      {...props}
    />
  )
}
