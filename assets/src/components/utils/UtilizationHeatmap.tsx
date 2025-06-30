import { ComputedNodeWithoutStyles } from '@nivo/treemap'
import chroma from 'chroma-js'
import {
  formatCpu,
  formatMemory,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
import { HeatMapFlavor, MetricPointResponseFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { ChartTooltip } from './ChartTooltip'
import { TreeMap } from './TreeMap'

export function UtilizationHeatmap({
  data,
  loading,
  flavor = HeatMapFlavor.Pod,
  utilizationType,
  colorScheme = 'blue',
}: {
  data: MetricPointResponseFragment[]
  loading?: boolean
  flavor?: HeatMapFlavor
  utilizationType: 'cpu' | 'memory'
  colorScheme?: 'blue' | 'purple'
}) {
  const baseColor = colorScheme === 'blue' ? '#0aa5ff' : '#4a51f2'

  const treeMapData = {
    name: 'data',
    children: data.map(({ metric, value }) => ({
      name: (metric?.[flavor.toLowerCase()] ?? '') as string,
      amount: Number(value?.value) || 0,
    })),
  }

  const { minValue, maxValue } = treeMapData.children.reduce(
    ({ minValue, maxValue }, { amount }) => ({
      minValue: Math.min(minValue, amount),
      maxValue: Math.max(maxValue, amount),
    }),
    { minValue: Infinity, maxValue: -Infinity }
  )

  const getColor = ({ value }: { value: number }) => {
    const normalizedValue = (value - minValue) / (maxValue - minValue) || 0
    return chroma(baseColor).set('hsl.l', 0.8 - normalizedValue / 6)
  }

  return (
    <TreeMap
      loading={loading}
      type="canvas"
      tooltip={({ node }) => (
        <ChartTooltip
          tooltipStyles={{ maxWidth: 200 }}
          color={node.color}
          value={node.formattedValue}
          label={node.id}
        />
      )}
      label={truncatedGraphLabel}
      colors={getColor}
      valueFormat={(d) => formatValue(d, utilizationType)}
      data={treeMapData}
    />
  )
}

export function truncatedGraphLabel(
  node: Omit<ComputedNodeWithoutStyles<object>, 'label' | 'parentLabel'>
) {
  const size = node.width > node.height ? node.width : node.height
  return truncate(node.id, { length: size / 8 })
}

function formatValue(value: number, type: 'cpu' | 'memory') {
  switch (type) {
    case 'cpu':
      return formatCpu(value)
    case 'memory':
      return formatMemory(value)
    default:
      return `${value}`
  }
}
