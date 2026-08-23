export const LAST_SELECTED_CLUSTER_KEY = 'plural-last-selected-cluster'

export function withCurrentCluster<T extends { id: string }>(
  clusters: T[],
  current: T | null | undefined
): T[] {
  if (!current?.id) return clusters
  if (clusters.some((cluster) => cluster.id === current.id)) return clusters

  return [current, ...clusters]
}

export function selectMatchingCluster<T extends { id: string }>(
  clusterId: string | undefined,
  candidates: Array<T | null | undefined>
): T | undefined {
  if (!clusterId) return undefined

  return (
    candidates.find((candidate) => candidate?.id === clusterId) ?? undefined
  )
}

export function getDefaultKubernetesClusterId<
  T extends { id: string; self?: boolean | null },
>(clusters: T[], lastSelectedClusterId: string | null): string | undefined {
  if (clusters.length === 0) return undefined

  const lastSelectedClusterExists = clusters.some(
    ({ id }) => id === lastSelectedClusterId
  )
  if (lastSelectedClusterExists && lastSelectedClusterId) {
    return lastSelectedClusterId
  }

  return clusters.find(({ self }) => !!self)?.id ?? clusters[0].id
}

export function isKubernetesClusterMissing({
  clusterId,
  loading,
  hasData,
  currentClusterId,
  clusterIds,
}: {
  clusterId: string | undefined
  loading: boolean
  hasData: boolean
  currentClusterId: string | null | undefined
  clusterIds: string[]
}): boolean {
  if (!clusterId || loading || !hasData) return false

  return (
    currentClusterId !== clusterId && !clusterIds.some((id) => id === clusterId)
  )
}
