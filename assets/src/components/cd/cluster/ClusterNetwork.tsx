import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { NetworkGraph } from 'components/utils/network-graph/NetworkGraph'
import Fuse from 'fuse.js'
import {
  NetworkMeshEdgeFragment,
  useClusterNetworkGraphQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'

const searchOptions: Fuse.IFuseOptions<NetworkMeshEdgeFragment> = {
  keys: ['from.name', 'from.service', 'to.name', 'to.service'],
  threshold: 0.25,
  ignoreLocation: true,
}

export function ClusterNetwork() {
  const { clusterId = '' } = useParams()
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 500)
  const [namespace, setNamespace] = useState<string | undefined>(undefined)
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined)
  const { data, loading, error } = useClusterNetworkGraphQuery({
    variables: { clusterId, namespace, time: timestamp },
    fetchPolicy: 'cache-and-network',
  })

  const network = useMemo(() => {
    const filteredData =
      data?.cluster?.networkGraph
        ?.filter(isNonNullable)
        .filter(
          (edge) =>
            !namespace ||
            edge.from.namespace === namespace ||
            edge.to.namespace === namespace
        ) ?? []
    return throttledQ
      ? new Fuse(filteredData, searchOptions)
          .search(throttledQ)
          .map(({ item }) => item)
      : filteredData
  }, [data?.cluster?.networkGraph, namespace, throttledQ])

  if (error) return <GqlError error={error} />

  return (
    <NetworkGraph
      networkData={network}
      loading={!data && loading}
      q={q}
      setQ={setQ}
      namespace={namespace}
      setNamespace={setNamespace}
      setTimestamp={setTimestamp}
      isTimestampSet={!!timestamp}
    />
  )
}
