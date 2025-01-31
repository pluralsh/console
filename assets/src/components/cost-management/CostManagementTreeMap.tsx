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

const MIN_COST_PERCENTAGE = 0.02

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
  const avg =
    usages.reduce((acc, usage) => acc + (usage.nodeCost ?? 0), 0) /
    usages.length
  const projectMap: Record<string, TreeMapData> = {}

  for (const usage of usages) {
    if (!usage.cpuCost || !usage.cluster?.project) continue

    const project = usage.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

    if (usage.cpuCost / avg > MIN_COST_PERCENTAGE)
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
