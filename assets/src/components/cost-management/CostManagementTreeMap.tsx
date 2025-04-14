import {
  PARENT_NODE_NAME,
  TreeMap,
  TreeMapData,
  TreeMapProps,
} from 'components/utils/TreeMap'
import {
  ClusterNamespaceUsageFragment,
  ClusterUsageTinyFragment,
} from 'generated/graphql'

export function CostManagementTreeMap({
  data,
  type,
  dataSize,
  colorScheme = 'blue',
  ...props
}: TreeMapProps) {
  return (
    <TreeMap
      data={data}
      type={type}
      dataSize={dataSize}
      colorScheme={colorScheme}
      valueFormat="$,.2f"
      emptyStateMessage="No costs to display"
      {...props}
    />
  )
}

export function cpuCostByCluster(usages: ClusterUsageTinyFragment[]) {
  const projectMap: Record<string, TreeMapData> = {}

  for (const usage of usages) {
    if (!usage.cpuCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

    projectMap[project].children?.push({
      name: usage.cluster?.name ?? usage.id,
      amount: usage.cpuCost,
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
    children: usages.map((usage) => ({
      name: usage.namespace ?? usage.id,
      amount: usage.cpuCost,
    })),
  }
}

export function memoryCostByNamespace(usages: ClusterNamespaceUsageFragment[]) {
  return {
    name: PARENT_NODE_NAME,
    children: usages.map((usage) => ({
      name: usage.namespace ?? usage.id,
      amount: usage.memoryCost,
    })),
  }
}
