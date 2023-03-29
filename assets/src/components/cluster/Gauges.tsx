import { ReactNode, useMemo } from 'react'
import { filesize } from 'filesize'
import styled from 'styled-components'

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
  ...props
}: Omit<FlexProps, 'heading'> & { heading: ReactNode }) {
  return (
    <Flex
      flexDirection="column"
      justifyContent="space-between"
      overflow="visible"
      {...props}
    >
      {children}
      <ChartHeading>{heading}</ChartHeading>
    </Flex>
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
  type: 'cpu' | 'memory'
}) {
  const hoverLabel = type === 'cpu' ? 'CPU' : 'Memory'
  const barLabel = type === 'cpu' ? 'CPU' : 'Mem.'

  const data = useMemo(
    () => [
      {
        id: `${barLabel} usage`,
        data: [
          {
            x: `${hoverLabel} used`,
            y: used,
          },
          {
            x: `${hoverLabel} available`,
            y: total - used,
          },
        ],
      },
      {
        id: `${barLabel} lim.`,
        data: [
          {
            x: `${hoverLabel} limits`,
            y: limits,
          },
        ],
      },
      {
        id: `${barLabel} req.`,
        data: [
          {
            x: `${hoverLabel} requests`,
            y: requests,
          },
        ],
      },
    ],
    [barLabel, hoverLabel, limits, requests, total, used]
  )

  return (
    <RadialBarChart
      data={data}
      valueFormat={
        type === 'cpu'
          ? (val) => cpuFmt(roundToTwoPlaces(val))
          : type === 'memory'
          ? (val) => filesize(roundToTwoPlaces(val)) as string
          : undefined
      }
      centerVal={`${Math.round((used / total) * 100)}%`}
      centerLabel="used"
      {...props}
    />
  )
}
