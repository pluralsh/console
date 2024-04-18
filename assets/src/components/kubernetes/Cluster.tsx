import { createContext, useContext, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { isEmpty } from 'lodash'

import {
  KubernetesClusterFragment,
  Maybe,
  PinnedCustomResourceFragment,
  useKubernetesClustersQuery,
} from '../../generated/graphql'
import { mapExistingNodes } from '../../utils/graphql'
import { getWorkloadsAbsPath } from '../../routes/kubernetesRoutesConsts'
import { useNamespacesQuery } from '../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../helpers/kubernetes.client'

type ClusterContextT = {
  clusters: KubernetesClusterFragment[]
  cluster?: KubernetesClusterFragment
  namespaces: string[]
}

const ClusterContext = createContext<ClusterContextT | undefined>(undefined)

export const useClusterContext = () => {
  const ctx = useContext(ClusterContext)

  if (!ctx) {
    throw Error('useClusterContext() must be used within a ClusterContext')
  }

  return ctx
}

export const useClusters = () => {
  const { clusters } = useClusterContext()

  return clusters
}

export const useCluster = () => {
  const { cluster } = useClusterContext()

  return cluster
}

export const usePinnedResources = (): Maybe<PinnedCustomResourceFragment>[] => {
  const cluster = useCluster()

  return cluster?.pinnedCustomResources ?? []
}

export const useIsPinnedResource = (
  kind: string,
  version: string,
  group: string
) => {
  const pinnedResources = usePinnedResources()

  return !!pinnedResources.find(
    (pr) => pr?.group === group && pr?.version === version && pr?.kind === kind
  )
}

export const useNamespaces = () => {
  const { namespaces } = useClusterContext()

  return namespaces
}

export default function Cluster() {
  const { clusterId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data } = useKubernetesClustersQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  const cluster = useMemo(
    () => clusters.find(({ id }) => id === clusterId),
    [clusterId, clusters]
  )

  const { data: namespacesData } = useNamespacesQuery({
    client: KubernetesClient(clusterId!),
    skip: !clusterId,
  })

  const namespaces = useMemo(
    () =>
      (namespacesData?.handleGetNamespaces?.namespaces ?? [])
        .map((namespace) => namespace?.objectMeta?.name)
        .filter((namespace): namespace is string => !isEmpty(namespace)),
    [namespacesData?.handleGetNamespaces?.namespaces]
  )

  const context = useMemo(
    () => ({ clusters, cluster, namespaces }) as ClusterContextT,
    [clusters, cluster, namespaces]
  )

  useEffect(() => {
    if (!isEmpty(clusters) && !clusterId) {
      const mgmtCluster = clusters.find(({ self }) => !!self)

      if (mgmtCluster) {
        navigate(getWorkloadsAbsPath(mgmtCluster.id) + search)
      }
    }
  }, [clusters, navigate, search, clusterId])

  return (
    <ClusterContext.Provider value={context}>
      <Outlet />
    </ClusterContext.Provider>
  )
}
