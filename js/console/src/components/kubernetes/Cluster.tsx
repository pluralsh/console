import { EmptyState } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react'
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { useTheme } from 'styled-components'

import { useQuery } from '@tanstack/react-query'

import {
  KubernetesClusterFragment,
  Maybe,
  PinnedCustomResourceFragment,
  useKubernetesClustersQuery,
} from '../../generated/graphql'
import { getNamespacesOptions } from '../../generated/kubernetes/@tanstack/react-query.gen'

import { AxiosInstance } from '../../helpers/axios'
import { getKubernetesAbsPath } from '../../routes/kubernetesRoutesConsts'

import { mapExistingNodes } from '../../utils/graphql'
import { useProjectId } from '../contexts/ProjectsContext'
import { GqlError } from '../utils/Alert'
import LoadingIndicator from '../utils/LoadingIndicator'
import { useSimpleToast } from '../utils/SimpleToastContext'
import {
  getDefaultKubernetesClusterId,
  isKubernetesClusterMissing,
  LAST_SELECTED_CLUSTER_KEY,
  selectMatchingCluster,
} from './clusterSelection'
import { DataSelectProvider } from './common/DataSelect'
import { getNamespaceListLoadError } from './common/namespaceList'

type ClusterContextT = {
  clusters: KubernetesClusterFragment[]
  refetch?: Nullable<() => void>
  cluster?: KubernetesClusterFragment
  namespaces: string[]
}

export const ClusterContext = createContext<ClusterContextT | undefined>(
  undefined
)

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

export default function Cluster({
  getDefaultClusterPath = getKubernetesAbsPath,
}: {
  getDefaultClusterPath?: (clusterId: string) => string
}) {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const projectId = useProjectId()
  const { clusterId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data, previousData, error, refetch, loading } =
    useKubernetesClustersQuery({
      pollInterval: 60_000,
      fetchPolicy: 'cache-and-network',
      variables: {
        currentClusterId: clusterId,
        hasCurrentClusterId: !!clusterId,
        projectId,
      },
    })

  // Variable changes miss the cache, so `data` is empty while the new cluster
  // loads. Keep the previous result on screen so the dashboard doesn't unmount.
  const queryData = data ?? previousData
  const clusters = useMemo(
    () => mapExistingNodes(queryData?.clusters),
    [queryData?.clusters]
  )
  const cluster = selectMatchingCluster(clusterId, [
    data?.cluster,
    queryData?.cluster,
    ...clusters,
  ])

  const clusterMissing = isKubernetesClusterMissing({
    clusterId,
    loading,
    hasData: !!data,
    currentClusterId: data?.cluster?.id,
    clusterIds: mapExistingNodes(data?.clusters).map(({ id }) => id),
  })

  const namespaceQueryOptions = getNamespacesOptions({
    client: AxiosInstance(clusterId!),
  })

  const {
    data: namespacesData,
    error: namespacesError,
    isError: namespacesQueryError,
    refetch: refetchNamespaces,
  } = useQuery({
    ...namespaceQueryOptions,
    queryKey: [
      ...namespaceQueryOptions.queryKey,
      clusterId ?? '',
    ] as unknown as typeof namespaceQueryOptions.queryKey,
    enabled: !!clusterId,
    refetchInterval: 30_000,
  })

  const namespaceListError = useMemo(
    () =>
      getNamespaceListLoadError(
        namespacesData,
        namespacesQueryError,
        namespacesError
      ),
    [namespacesData, namespacesQueryError, namespacesError]
  )

  const namespaces = useMemo(
    () =>
      (namespacesData?.namespaces ?? [])
        .map((namespace) => namespace?.objectMeta?.name)
        .filter((namespace): namespace is string => !isEmpty(namespace)),
    [namespacesData?.namespaces]
  )

  useEffect(() => {
    if (!clusterId || !namespaceListError) return

    popToast({
      heading: 'Cannot load namespaces',
      content: namespaceListError,
      severity: 'danger',
    })
  }, [clusterId, namespaceListError, popToast])

  const context = useMemo(
    () =>
      ({
        clusters,
        refetch,
        cluster,
        namespaces,
      }) as ClusterContextT,
    [clusters, refetch, cluster, namespaces]
  )

  const defaultClusterId = useMemo(
    () =>
      getDefaultKubernetesClusterId(
        clusters,
        sessionStorage.getItem(LAST_SELECTED_CLUSTER_KEY)
      ),
    [clusters]
  )

  useLayoutEffect(() => {
    if (cluster && clusterId && cluster.id === clusterId) {
      sessionStorage.setItem(LAST_SELECTED_CLUSTER_KEY, cluster.id)
    }
  }, [cluster, clusterId])

  useEffect(() => {
    if (!clusterMissing || !defaultClusterId) return

    navigate(`${getDefaultClusterPath(defaultClusterId)}${search}`, {
      replace: true,
    })
  }, [
    clusterMissing,
    defaultClusterId,
    getDefaultClusterPath,
    navigate,
    search,
  ])

  useEffect(() => {
    refetchNamespaces()
  }, [refetchNamespaces, clusterId])

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load clusters"
          error={error}
        />
      </div>
    )

  if (!queryData) return <LoadingIndicator />

  if (!clusterId && defaultClusterId)
    return (
      <Navigate
        replace
        to={`${getDefaultClusterPath(defaultClusterId)}${search}`}
      />
    )

  if (!cluster && !loading) return <EmptyState message="No clusters found." />

  return (
    <ClusterContext value={context}>
      <DataSelectProvider>
        <Outlet />
      </DataSelectProvider>
    </ClusterContext>
  )
}
