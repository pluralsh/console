import { ResponsiveTreeMapCanvas, ResponsiveTreeMapHtml } from '@nivo/treemap'
import { EmptyState } from '@pluralsh/design-system'
import {
  ClusterNamespaceUsageFragment,
  ClusterUsageTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps } from 'react'
import styled from 'styled-components'

const PARENT_NODE_NAME = 'total'
const MIN_COST_PERCENTAGE = 0.02

type TreeMapData = {
  name: string
  amount?: Nullable<number>
  children?: Nullable<TreeMapData[]>
}

type TreeMapHtmlProps = Omit<
  ComponentProps<typeof ResponsiveTreeMapHtml>,
  'data'
>
type TreeMapCanvasProps = Omit<
  ComponentProps<typeof ResponsiveTreeMapCanvas>,
  'data'
>

type TreeMapProps = {
  data: TreeMapData
  dataSize?: number
  type?: 'html' | 'canvas'
  colorScheme?: 'blue' | 'purple'
} & (TreeMapHtmlProps | TreeMapCanvasProps)

const commonTreeMapProps = {
  identity: 'name',
  value: 'amount',
  valueFormat: ' >-$.2',
  innerPadding: 4,
  outerPadding: 8,
  label: (e) => e.id,
  labelSkipSize: 16,
  borderWidth: 0,
  nodeOpacity: 0.9,
}

export function CostManagementTreeMap({
  data,
  type,
  dataSize,
  colorScheme = 'blue',
  ...props
}: TreeMapProps) {
  if (isEmpty(data.children))
    return <EmptyState message="No costs to display" />
  const derivedType =
    !dataSize || dataSize > 35 || type === 'canvas' ? 'canvas' : 'html'
  return (
    <WrapperSC>
      {derivedType === 'canvas' ? (
        <ResponsiveTreeMapCanvas
          data={data}
          leavesOnly
          colors={colorScheme === 'blue' ? blueScheme : purpleScheme}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.2]],
          }}
          {...commonTreeMapProps}
          {...(props as TreeMapCanvasProps)}
        />
      ) : (
        <ResponsiveTreeMapHtml
          data={data}
          colors={colorScheme === 'blue' ? blueScheme : purpleScheme}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          parentLabelTextColor={{
            from: 'color',
            modifiers: [['darker', 4]],
          }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.2]],
          }}
          {...commonTreeMapProps}
          {...(props as TreeMapHtmlProps)}
        />
      )}
    </WrapperSC>
  )
}

// just used to override nivo styles when rendered in html
const WrapperSC = styled.div(({ theme }) => ({
  display: 'contents',
  // tooltip text
  color: theme.colors.grey[800],
  // hides wrapper parent node
  [`& div[id="${PARENT_NODE_NAME}"]`]: {
    display: 'none',
  },
}))

export function nodeCostByCluster(usages: ClusterUsageTinyFragment[]) {
  const avg =
    usages.reduce((acc, usage) => acc + (usage.nodeCost ?? 0), 0) /
    usages.length
  const projectMap: Record<string, TreeMapData> = {}

  for (const usage of usages) {
    if (!usage.nodeCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

    if (usage.nodeCost / avg > MIN_COST_PERCENTAGE)
      projectMap[project].children?.push({
        name: usage.cluster?.name ?? usage.id,
        amount: usage.nodeCost,
      })
  }

  return {
    name: PARENT_NODE_NAME,
    children: Object.values(projectMap),
  }
}

export function memoryCostByCluster(usages: ClusterUsageTinyFragment[]) {
  const projectMap: Record<string, TreeMapData> = {}
  const avg =
    usages.reduce((acc, usage) => acc + (usage.memoryCost ?? 0), 0) /
    usages.length

  for (const usage of usages) {
    if (!usage.memoryCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

    if (usage.memoryCost / avg > MIN_COST_PERCENTAGE)
      projectMap[project].children?.push({
        name: usage.cluster?.name ?? usage.id,
        amount: usage.memoryCost,
      })
  }

  return {
    name: PARENT_NODE_NAME,
    children: Object.values(projectMap),
  }
}

export function cpuCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  const avg =
    usages.reduce((acc, usage) => acc + (usage.cpuCost ?? 0), 0) / usages.length
  return {
    name: PARENT_NODE_NAME,
    children: usages
      .filter(
        (usage) => !!usage.cpuCost && usage.cpuCost / avg > MIN_COST_PERCENTAGE
      )
      .map((usage) => ({
        name: usage.namespace ?? usage.id,
        amount: usage.cpuCost,
      })),
  }
}

export function memoryCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  const avg =
    usages.reduce((acc, usage) => acc + (usage.memoryCost ?? 0), 0) /
    usages.length
  return {
    name: PARENT_NODE_NAME,
    children: usages
      .filter(
        (usage) =>
          !!usage.memoryCost && usage.memoryCost / avg > MIN_COST_PERCENTAGE
      )
      .map((usage) => ({
        name: usage.namespace ?? usage.id,
        amount: usage.memoryCost,
      })),
  }
}

const blueScheme = [
  '#d6f0ff',
  '#c2e9ff',
  '#ade1ff',
  '#99daff',
  '#66c7ff',
  '#4dbeff',
  '#33b4ff',
  '#0aa5ff',
]

const purpleScheme = [
  '#e2e3fd',
  '#cfd1fc',
  '#bcbffb',
  '#9fa3f9',
  '#747af6',
  '#5d63f4',
  '#4a51f2',
]
