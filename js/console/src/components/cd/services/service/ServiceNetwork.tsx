import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { NetworkGraph } from 'components/utils/network-graph/NetworkGraph'
import { useServiceNetworkGraphQuery } from 'generated/graphql'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

export function ServiceNetwork() {
  const { serviceId = '' } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined)

  const {
    data: newData,
    previousData,
    loading,
    error,
  } = useServiceNetworkGraphQuery({
    variables: { serviceId, time: timestamp },
  })
  const data = newData || previousData

  if (!(metricsEnabled || deploymentSettingsLoading))
    return <MetricsEmptyState />
  if (error) return <GqlError error={error} />

  return (
    <NetworkGraph
      networkData={data?.serviceDeployment?.networkGraph ?? []}
      loading={deploymentSettingsLoading || (!data && loading)}
      setTimestamp={setTimestamp}
      isTimestampSet={!!timestamp}
      enableNamespaceFilter={false}
    />
  )
}
