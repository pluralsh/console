import { createContext, useContext, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { isEmpty } from 'lodash'

import { useTheme } from 'styled-components'

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
import LoadingIndicator from '../utils/LoadingIndicator'
import { GqlError } from '../utils/Alert'

type ClusterContextT = {
  clusters: KubernetesClusterFragment[]
  refetch?: Nullable<() => void>
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

export const useRefetch = () => {
  const { refetch } = useClusterContext()

  return refetch
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
  kind: string | null | undefined,
  version: string | null | undefined,
  group: string | null | undefined
) => {
  const pinnedResources = usePinnedResources()

  if (!kind || !version || !group) return false

  return !!pinnedResources.find(
    (pr) => pr?.group === group && pr?.version === version && pr?.kind === kind
  )
}

export const useNamespaces = () => {
  const { namespaces } = useClusterContext()

  return namespaces
}

export default function Cluster() {
  const theme = useTheme()
  const { clusterId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data, error, refetch } = useKubernetesClustersQuery({
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
    () => ({ clusters, refetch, cluster, namespaces }) as ClusterContextT,
    [clusters, refetch, cluster, namespaces]
  )

  useEffect(() => {
    if (!isEmpty(clusters) && !clusterId) {
      const mgmtCluster = clusters.find(({ self }) => !!self)

      if (mgmtCluster) {
        navigate(getWorkloadsAbsPath(mgmtCluster.id) + search)
      }
    }
  }, [clusters, navigate, search, clusterId])

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load clusters"
          error={error}
        />
      </div>
    )

  if (!cluster) return <LoadingIndicator />

  return (
    <ClusterContext.Provider value={context}>
      <Outlet />
    </ClusterContext.Provider>
  )
}
