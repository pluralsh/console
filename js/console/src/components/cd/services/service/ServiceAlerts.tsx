import { useServiceAlertsQuery } from 'generated/graphql'

import { AlertsTable } from 'components/utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { useServiceContext } from './ServiceDetailsContext'

export function ServiceAlerts() {
  const { service, isLoading: serviceLoading } = useServiceContext()

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceAlertsQuery,
        keyPath: ['serviceDeployment', 'alerts'],
        skip: !service?.id,
      },
      { serviceId: service?.id ?? '' }
    )
  const isLoading = (!data && loading) || serviceLoading

  const alerts = useMemo(
    () => mapExistingNodes(data?.serviceDeployment?.alerts),
    [data?.serviceDeployment?.alerts]
  )

  return (
    <AlertsTable
      alerts={alerts}
      loading={isLoading}
      error={error}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}
