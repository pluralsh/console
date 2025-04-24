import { useServiceAlertsQuery } from 'generated/graphql'

import { AlertsTable } from 'components/utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { useServiceContext } from './ServiceDetails'

export function ServiceAlerts() {
  const { service } = useServiceContext()

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceAlertsQuery,
        keyPath: ['serviceDeployment', 'alerts'],
      },
      { serviceId: service?.id ?? '' }
    )

  const alerts = useMemo(
    () => mapExistingNodes(data?.serviceDeployment?.alerts),
    [data?.serviceDeployment?.alerts]
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
