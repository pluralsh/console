import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { NetworkGraph } from 'components/utils/network-graph/NetworkGraph'
import { useClusterNetworkGraphQuery } from 'generated/graphql'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MetricsEmptyState } from './ClusterMetrics'

export function ClusterNetwork() {
  const { clusterId = '' } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined)

  const {
    data: newData,
    previousData,
    loading,
    error,
  } = useClusterNetworkGraphQuery({
    variables: { clusterId, time: timestamp },
  })
  const data = newData || previousData

  if (!(metricsEnabled || deploymentSettingsLoading))
    return <MetricsEmptyState />
  if (error) return <GqlError error={error} />

  return (
    <NetworkGraph
      networkData={data?.cluster?.networkGraph ?? []}
      loading={deploymentSettingsLoading || (!data && loading)}
      setTimestamp={setTimestamp}
      isTimestampSet={!!timestamp}
    />
  )
}
