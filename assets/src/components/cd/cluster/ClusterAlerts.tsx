import { AlertsTable } from 'components/utils/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useClusterAlertsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { useClusterContext } from './Cluster'

export function ClusterAlerts() {
  const { cluster } = useClusterContext()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useClusterAlertsQuery, keyPath: ['cluster', 'alerts'] },
      { clusterId: cluster?.id ?? '' }
    )
  const alerts = useMemo(
    () => mapExistingNodes(data?.cluster?.alerts),
    [data?.cluster?.alerts]
  )

  return (
    <AlertsTable
      alerts={alerts}
      loading={!data && loading}
      error={error}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}
