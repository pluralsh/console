import { ResponsivePie } from '@nivo/pie'
import { ComponentProps, ReactNode, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { useChartTheme } from './charts'
import { ChartTooltip } from './ChartTooltip'

type PieChartData = {
  label?: string
  id: string
  value: number
  color: string
}[]
export function PieChart({
  data,
  width,
  height,
  rotate = 45,
  ...props
}: {
  data: PieChartData
  width?: number | string
  height?: number | string
  rotate?: number
} & Omit<ComponentProps<typeof ResponsivePie>, 'data'>) {
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
    <ChartSizeOption
      width={width}
      height={height}
    >
      <ResponsivePie
        activeOuterRadiusOffset={3}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        colors={{ datum: 'data.color' }}
        data={pieData}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        innerRadius={0.75}
        startAngle={rotate}
        endAngle={360 + rotate}
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
    </ChartSizeOption>
  )
}

function ChartSizeOption({
  width,
  height,
  children,
}: {
  width?: number | string
  height?: number | string
  children: ReactNode
}) {
  return width || height ? (
    <div css={{ width: width || undefined, height: height || undefined }}>
      {children}
    </div>
  ) : (
    children
  )
}
