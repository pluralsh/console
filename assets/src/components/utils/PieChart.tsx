import { ResponsivePie } from '@nivo/pie'
import { ComponentProps } from 'react'

export type PieChartData = {id: string, value: number, color: string}[]

export function PieChart({ data, ...props }: ComponentProps<typeof ResponsivePie>) {
  return (
    <ResponsivePie
      activeOuterRadiusOffset={3}
      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
      colors={({ data: { color } }) => color}
      data={data}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      innerRadius={0.75}
      margin={{
        top: 10, right: 10, bottom: 10, left: 10,
      }}
      theme={{ tooltip: { container: { background: '#2A2E37', color: '#FFFFFF' } } }}
      {...props}
    />
  )
}
