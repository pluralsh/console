import { createContext, useContext, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { isEmpty } from 'lodash'

import {
  ClusterTinyFragment,
  useClustersTinyQuery,
} from '../../generated/graphql'
import { mapExistingNodes } from '../../utils/graphql'

import { getWorkloadsAbsPath } from '../../routes/kubernetesRoutesConsts'

type ClusterContextT = {
  clusters: ClusterTinyFragment[]
  cluster?: ClusterTinyFragment
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

export default function Cluster() {
  const { clusterId } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()

  const { data } = useClustersTinyQuery({
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

  const context = useMemo(
    () => ({ clusters, cluster }) as ClusterContextT,
    [clusters, cluster]
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
