import { ResponsivePie } from '@nivo/pie'
import { ComponentProps } from 'react'

import { CHART_THEME } from './charts'
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
  return (
    <ResponsivePie
      activeOuterRadiusOffset={3}
      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
      colors={{ datum: 'data.color' }}
      data={data}
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
      theme={CHART_THEME}
      {...props}
    />
  )
}
