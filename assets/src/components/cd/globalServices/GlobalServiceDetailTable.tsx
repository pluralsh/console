import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  GetServiceDataQuery,
  type ServiceDeploymentsRowFragment,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

import { ComponentProps } from 'react'

import { SERVICES_REACT_VIRTUAL_OPTIONS, columns } from '../services/Services'

export function GlobalServiceDetailTable({
  error,
  data,
  ...props
}: {
  error?: ApolloError
  data?: GetServiceDataQuery
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const navigate = useNavigate()

  const globalService = data?.globalService
  const services = globalService?.services?.edges

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <FullHeightTableWrap flex={1}>
      <Table
        virtualizeRows
        data={services || []}
        columns={columns}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
        onRowClick={(
          _e,
          { original }: Row<Edge<ServiceDeploymentsRowFragment>>
        ) =>
          navigate(
            getServiceDetailsPath({
              clusterId: original.node?.cluster?.id,
              serviceId: original.node?.id,
            })
          )
        }
        reactTableOptions={{ meta: { refetch: () => undefined } }}
        reactVirtualOptions={SERVICES_REACT_VIRTUAL_OPTIONS}
        emptyStateProps={{
          message: 'Looks like this service does not exist.',
        }}
        {...props}
      />
    </FullHeightTableWrap>
  )
}
