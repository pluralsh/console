import { isEmpty } from 'lodash'
import { createContext, useContext, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { EmptyState } from '@pluralsh/design-system'

import {
  KubernetesClusterFragment,
  Maybe,
  PinnedCustomResourceFragment,
  useKubernetesClustersQuery,
} from '../../generated/graphql'
import { useNamespacesQuery } from '../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../helpers/kubernetes.client'
import { mapExistingNodes } from '../../utils/graphql'
import { useProjectId } from '../contexts/ProjectsContext'
import { GqlError } from '../utils/Alert'
import LoadingIndicator from '../utils/LoadingIndicator'

import { LAST_SELECTED_CLUSTER_KEY } from './Navigation'

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
  const projectId = useProjectId()
  const { clusterId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data, error, refetch, loading } = useKubernetesClustersQuery({
    pollInterval: 120_000,
    fetchPolicy: 'cache-and-network',
    variables: { projectId },
  })

  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )

  const hasCurrentClusterId = clusters.some(({ id }) => id === clusterId)

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
    if (!isEmpty(clusters) && !hasCurrentClusterId) {
      const lastSelectedClusterId = sessionStorage.getItem(
        LAST_SELECTED_CLUSTER_KEY
      )
      const lastSelectedClusterExists = clusters.some(
        ({ id }) => id === lastSelectedClusterId
      )
      const mgmtCluster = clusters.find(({ self }) => !!self)

      const redirectId = lastSelectedClusterExists
        ? lastSelectedClusterId
        : mgmtCluster
          ? mgmtCluster?.id
          : clusters[0].id

      navigate(`${redirectId}${search}`, {
        replace: true,
      })
    }
  }, [clusters, navigate, search, clusterId, hasCurrentClusterId])

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load clusters"
          error={error}
        />
      </div>
    )

  if (loading) return <LoadingIndicator />

  if (!cluster) return <EmptyState message="No clusters found." />

  return (
    <ClusterContext.Provider value={context}>
      <Outlet />
    </ClusterContext.Provider>
  )
}
