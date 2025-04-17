import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { NetworkGraph } from 'components/utils/network-graph/NetworkGraph'
import { useClusterNetworkGraphQuery } from 'generated/graphql'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MetricsEmptyState } from './ClusterMetrics'

export function ClusterNetwork() {
  const { clusterId = '' } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined)

  const { data, loading, error } = useClusterNetworkGraphQuery({
    variables: { clusterId, time: timestamp },
    fetchPolicy: 'cache-and-network',
  })

  if (!metricsEnabled) return <MetricsEmptyState />
  if (error) return <GqlError error={error} />

  return (
    <NetworkGraph
      networkData={data?.cluster?.networkGraph ?? []}
      loading={!data && loading}
      setTimestamp={setTimestamp}
      isTimestampSet={!!timestamp}
    />
  )
}
