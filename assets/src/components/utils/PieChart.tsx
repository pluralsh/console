import { ResponsivePie } from '@nivo/pie'
import { ComponentProps, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { useChartTheme } from './charts'
import { ChartTooltip } from './ChartTooltip'

export type PieChartData = {
  label?: string
  id: string
  value: number
  color: string
}[]
export function PieChart({
  data,
  ...props
}: { data: PieChartData } & Omit<
  ComponentProps<typeof ResponsivePie>,
  'data'
>) {
  const chartTheme = useChartTheme()
  const theme = useTheme()
  const isEmpty = useMemo(
    () => !(data || []).reduce((count, elt) => count + elt.value || 0, 0),
    [data]
  )
  const pieData = useMemo(
    () =>
      isEmpty
        ? [
            {
              id: '',
              label: '',
              value: 1,
              color: theme.colors['fill-three'],
            },
          ]
        : data,
    [data, isEmpty, theme.colors]
  )

  return (
    <ResponsivePie
      activeOuterRadiusOffset={3}
      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
      colors={{ datum: 'data.color' }}
      data={pieData}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      innerRadius={0.75}
      margin={{
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      }}
      tooltip={({ datum }) => (
        <ChartTooltip
          color={datum.color}
          label={datum.label}
          value={datum.formattedValue}
        />
      )}
      theme={chartTheme}
      {...props}
      {...(isEmpty ? { isInteractive: false } : {})}
    />
  )
}
