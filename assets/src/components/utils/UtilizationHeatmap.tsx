import { ComputedNodeWithoutStyles } from '@nivo/treemap'
import chroma from 'chroma-js'
import { HeatMapFlavor, MetricPointResponseFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { TreeMap } from './TreeMap'
import {
  formatCpu,
  formatMemory,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'

export function UtilizationHeatmap({
  data,
  flavor,
  utilizationType,
  colorScheme = 'blue',
}: {
  data: MetricPointResponseFragment[]
  flavor: HeatMapFlavor
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
      type="canvas"
      label={truncatedLabel}
      colors={getColor}
      valueFormat={(d) => formatValue(d, utilizationType)}
      data={treeMapData}
    />
  )
}

function truncatedLabel(
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
