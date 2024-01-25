import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ComponentProps, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import { createColumnHelper } from '@tanstack/react-table'

import {
  CD_REL_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

const columnHelper = createColumnHelper<Nullable<ServiceError>>()

export const ColSource = columnHelper.accessor((row) => row?.source, {
  id: 'source',
  header: 'Source',
  enableSorting: true,
  cell: ({ getValue }) => getValue(),
})

export const ColMessage = columnHelper.accessor((row) => row?.message, {
  id: 'message',
  header: 'Message',
  enableSorting: true,
  meta: { truncate: true },
  cell: ({ getValue }) => getValue(),
})

const columns = [ColSource, ColMessage]

export function ServiceErrorsTable({
  errors,
  ...props
}: {
  errors: Nullable<ServiceDeploymentsRowFragment['errors']>
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  return (
    <Table
      data={errors || []}
      columns={columns}
      emptyStateProps={{ message: 'No errors' }}
      reactTableOptions={{
        getRowId(original, index) {
          return `${index}${original?.source}${original?.message}`
        },
      }}
      {...props}
    />
  )
}

export default function ServiceErrors() {
  const { serviceId, clusterId } = useParams<{
    [SERVICE_PARAM_ID]: string
    [SERVICE_PARAM_CLUSTER_ID]: string
  }>()
  const { service } = useServiceContext()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getServiceDetailsBreadcrumbs({
          cluster: service?.cluster || { id: clusterId || '' },
          service: service || { id: serviceId || '' },
        }),
        {
          label: 'errors',
          url: `${CD_REL_PATH}/services/${serviceId}/errors`,
        },
      ],
      [clusterId, service, serviceId]
    )
  )

  return (
    <ScrollablePage
      scrollable={false}
      heading="Errors"
    >
      {isEmpty(service.errors) ? (
        <EmptyState message="No errors" />
      ) : (
        <FullHeightTableWrap>
          <ServiceErrorsTable
            errors={service.errors}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      )}
    </ScrollablePage>
  )
}
