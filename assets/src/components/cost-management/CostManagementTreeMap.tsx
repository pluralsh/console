import { ResponsiveTreeMapHtml } from '@nivo/treemap'
import { EmptyState } from '@pluralsh/design-system'
import {
  ClusterNamespaceUsageFragment,
  ClusterUsageTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentProps } from 'react'
import styled from 'styled-components'

const PARENT_NODE_NAME = 'total'

type TreeMapData = {
  name: string
  amount?: Nullable<number>
  children?: Nullable<TreeMapData[]>
}

export function CostManagementTreeMap({
  data,
  colorScheme = 'blue',
  ...props
}: { data: TreeMapData; colorScheme?: 'blue' | 'purple' } & Omit<
  ComponentProps<typeof ResponsiveTreeMapHtml>,
  'data'
>) {
  if (isEmpty(data.children))
    return <EmptyState message="No costs to display" />
  return (
    <WrapperSC>
      <ResponsiveTreeMapHtml
        data={data}
        identity="name"
        value="amount"
        valueFormat=" >-$.2"
        innerPadding={4}
        outerPadding={8}
        // label={(e) => e.id + ' (' + e.formattedValue + ')'}
        label={(e) => e.id}
        labelSkipSize={16}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 4]],
        }}
        parentLabelTextColor={{
          from: 'color',
          modifiers: [['darker', 4]],
        }}
        borderWidth={0}
        colors={colorScheme === 'blue' ? blueScheme : purpleScheme}
        nodeOpacity={0.8}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 1.2]],
        }}
        {...props}
      />
    </WrapperSC>
  )
}

// just used to override nivo styles
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
  const projectMap: Record<string, TreeMapData> = {}
  for (const usage of usages) {
    if (!usage.nodeCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

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
  for (const usage of usages) {
    if (!usage.memoryCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

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
  return {
    name: PARENT_NODE_NAME,
    children: usages
      .filter((usage) => !!usage.cpuCost)
      .map((usage) => ({
        name: usage.namespace ?? usage.id,
        amount: usage.cpuCost,
      })),
  }
}

export function memoryCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  return {
    name: PARENT_NODE_NAME,
    children: usages
      .filter((usage) => !!usage.memoryCost)
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
