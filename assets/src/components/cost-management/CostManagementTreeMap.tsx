import { ResponsiveTreeMapHtml } from '@nivo/treemap'
import { useThemeColorMode } from '@pluralsh/design-system'
import {
  ClusterNamespaceUsageFragment,
  ClusterUsageTinyFragment,
} from 'generated/graphql'

type TreeMapData = {
  name: string
  color: string
  amount?: number
  children?: TreeMapData[]
}

export function CostManagementTreeMap({ data }: { data: TreeMapData }) {
  const colorMode = useThemeColorMode()
  return (
    <ResponsiveTreeMapHtml
      data={data}
      identity="name"
      value="amount"
      valueFormat=" >-$.3s"
      innerPadding={2}
      label={(e) => e.id + ' (' + e.formattedValue + ')'}
      labelSkipSize={12}
      labelTextColor={{
        from: 'color',
        modifiers: [[colorMode === 'dark' ? 'brighter' : 'darker', 2]],
      }}
      enableParentLabel={false}
      parentLabelTextColor={{
        from: 'color',
        modifiers: [[colorMode === 'dark' ? 'brighter' : 'darker', 3]],
      }}
      colors={{ scheme: 'blues' }}
      nodeOpacity={0.45}
      borderColor={{
        from: 'color',
        modifiers: [[colorMode === 'dark' ? 'brighter' : 'darker', 0.1]],
      }}
    />
  )
}

export function cpuCostByCluster(usages: ClusterUsageTinyFragment[]) {
  return {
    name: 'cpu cost by cluster',
    color: 'blue',
    children: usages.map((usage) => ({
      name: usage.cluster?.name ?? usage.id,
      color: 'blue',
      amount: usage.cpuCost ?? 0,
    })),
  }
}

export function memoryCostByCluster(usages: ClusterUsageTinyFragment[]) {
  return {
    name: 'memory cost by cluster',
    color: 'blue',
    children: usages.map((usage) => ({
      name: usage.cluster?.name ?? usage.id,
      color: 'blue',
      amount: usage.memoryCost ?? 0,
    })),
  }
}

export function cpuCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  return {
    name: 'cpu cost by namespace',
    color: 'blue',
    children: usages.map((usage) => ({
      name: usage.namespace ?? usage.id,
      color: 'blue',
      amount: usage.cpuCost ?? 0,
    })),
  }
}

export function memoryCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  return {
    name: 'memory cost by namespace',
    color: 'blue',
    children: usages.map((usage) => ({
      name: usage.namespace ?? usage.id,
      color: 'blue',
      amount: usage.memoryCost ?? 0,
    })),
  }
}
