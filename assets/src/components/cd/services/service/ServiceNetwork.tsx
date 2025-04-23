import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { NetworkGraph } from 'components/utils/network-graph/NetworkGraph'
import { useServiceNetworkGraphQuery } from 'generated/graphql'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

export function ServiceNetwork() {
  const { serviceId = '' } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined)

  const { data, loading, error } = useServiceNetworkGraphQuery({
    variables: { serviceId, time: timestamp },
    fetchPolicy: 'cache-and-network',
  })

  if (!metricsEnabled) return <MetricsEmptyState />
  if (error) return <GqlError error={error} />

  return (
    <NetworkGraph
      networkData={data?.serviceDeployment?.networkGraph ?? []}
      loading={!data && loading}
      setTimestamp={setTimestamp}
      isTimestampSet={!!timestamp}
      enableNamespaceFilter={false}
    />
  )
}
