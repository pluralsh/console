import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import type { Row } from '@tanstack/react-table'
import {
  GetManagedNamespaceQuery,
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

export function NamespacesDetailTable({
  error,
  data,
  ...props
}: {
  error?: ApolloError
  data?: GetManagedNamespaceQuery
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  const navigate = useNavigate()
  const services = data?.managedNamespace?.services?.edges

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <FullHeightTableWrap>
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
        {...props}
      />
    </FullHeightTableWrap>
  )
}
