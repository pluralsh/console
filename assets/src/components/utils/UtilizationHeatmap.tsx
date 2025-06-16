import { ComputedNode, ComputedNodeWithoutStyles } from '@nivo/treemap'
import { Flex, Tooltip } from '@pluralsh/design-system'
import chroma from 'chroma-js'
import {
  formatCpu,
  formatMemory,
} from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
import { HeatMapFlavor, MetricPointResponseFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { useCursorPosition } from './CursorPosition'
import { TreeMap } from './TreeMap'
import { useState } from 'react'

export function UtilizationHeatmap({
  data,
  flavor,
  utilizationType,
  colorScheme = 'blue',
  customTooltip = false,
}: {
  data: MetricPointResponseFragment[]
  flavor: HeatMapFlavor
  utilizationType: 'cpu' | 'memory'
  colorScheme?: 'blue' | 'purple'
  customTooltip?: boolean
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
      tooltip={customTooltip ? TooltipContent : undefined}
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

// hacky method to ensure tooltip is portaled so it doesn't get cut off by the parent container, tradeoff being we have to handle position tracking manually
// should find a better solution for this
function TooltipContent({ node }: { node: ComputedNode<object> }) {
  const cursorPos = useCursorPosition()
  const [height, setHeight] = useState(32)
  return (
    <Tooltip
      manualOpen
      displayOn="manual"
      placement="top"
      arrow={false}
      style={{
        top: (cursorPos?.y ?? 0) - height - 24,
        left: (cursorPos?.x ?? 0) - 160,
      }}
      label={
        <Flex
          ref={(ref) => setHeight(ref?.clientHeight ?? 32)}
          gap="small"
          align="center"
        >
          <div
            style={{
              backgroundColor: node.color,
              width: 10,
              height: 10,
              flexShrink: 0,
            }}
          />
          <span>
            {node.id}: <strong>{node.formattedValue}</strong>
          </span>
        </Flex>
      }
    >
      <div />
    </Tooltip>
  )
}
