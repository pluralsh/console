import {
  Breadcrumb,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'

import {
  CD_REL_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { columns } from '../ServiceDependenciesColumns'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export default function ServiceDependencies() {
  const { serviceId, clusterId } = useParams<{
    [SERVICE_PARAM_ID]: string
    [SERVICE_PARAM_CLUSTER_ID]: string
  }>()
  const { service } = useServiceContext()

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'dependencies',
        url: `${CD_REL_PATH}/services/${serviceId}/dependencies`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Dependencies"
    >
      {isEmpty(service.dependencies) ? (
        <EmptyState message="No dependencies" />
      ) : (
        <Table
          fullHeightWrap
          data={service?.dependencies || []}
          columns={columns}
        />
      )}
    </ScrollablePage>
  )
}
