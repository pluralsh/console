import { AlertsTable } from 'components/utils/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { AlertFragment, useClusterAlertsQuery } from 'generated/graphql'
import { useClusterContext } from './Cluster'

export function ClusterAlerts() {
  const { cluster } = useClusterContext()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useClusterAlertsQuery, keyPath: ['cluster', 'alerts'] },
      { clusterId: cluster?.id ?? '' }
    )
  const alerts =
    data?.cluster?.alerts?.edges
      ?.map((edge) => edge?.node)
      .filter((alert): alert is AlertFragment => alert !== null) ?? []

  return (
    <AlertsTable
      alerts={alerts}
      loading={loading}
      error={error}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}
