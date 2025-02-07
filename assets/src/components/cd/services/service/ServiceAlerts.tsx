import { AlertFragment, useServiceAlertsQuery } from 'generated/graphql'

import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { AlertsTable } from 'components/utils/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CD_REL_PATH } from 'routes/cdRoutesConsts'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export function ServiceAlerts() {
  const { service } = useServiceContext()
  const { serviceId, clusterId } = useParams()

  const breadcrumbs = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster ?? { id: clusterId ?? '' },
        service: service ?? { id: serviceId ?? '' },
      }),
      { label: 'alerts', url: `${CD_REL_PATH}/services/${serviceId}/alerts` },
    ],
    [clusterId, service, serviceId]
  )
  useSetBreadcrumbs(breadcrumbs)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceAlertsQuery,
        keyPath: ['serviceDeployment', 'alerts'],
      },
      { serviceId: service?.id ?? '' }
    )
  const alerts =
    data?.serviceDeployment?.alerts?.edges
      ?.map((edge) => edge?.node)
      .filter((alert): alert is AlertFragment => !!alert) ?? []

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
