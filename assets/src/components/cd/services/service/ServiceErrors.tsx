import { Card, EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps } from 'react'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ServiceDeploymentsRowFragment, ServiceError } from 'generated/graphql'

import { useTheme } from 'styled-components'

import { useServiceContext } from './ServiceDetails'

const columnHelper = createColumnHelper<Nullable<ServiceError>>()

export const ColSource = columnHelper.accessor((row) => row?.source, {
  id: 'source',
  header: 'Source',
  enableSorting: true,
  meta: { gridTemplate: '1fr' },
  cell: ({ getValue }) => getValue(),
})

export const ColSeverity = columnHelper.accessor((row) => row?.warning, {
  id: 'severity',
  header: 'Severity',
  enableSorting: true,
  meta: { gridTemplate: '1fr' },
  cell: ({ getValue }) => (getValue() ? 'Warning' : 'Error'),
})

export const ColMessage = columnHelper.accessor((row) => row?.message, {
  id: 'message',
  header: 'Message',
  enableSorting: true,
  meta: { gridTemplate: '6fr' },
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <Card css={{ padding: theme.spacing.small, width: '100%' }}>
        <pre
          css={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {getValue()}
        </pre>
      </Card>
    )
  },
})

const columns = [ColSource, ColSeverity, ColMessage]

export function ServiceErrorsTable({
  errors,
  ...props
}: {
  errors: Nullable<ServiceDeploymentsRowFragment['errors']>
} & Omit<ComponentProps<typeof Table>, 'data' | 'columns'>) {
  return (
    <Table
      fullHeightWrap
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
  const { service } = useServiceContext()

  return (
    <ScrollablePage
      scrollable={false}
      heading="Errors"
    >
      {isEmpty(service.errors) ? (
        <EmptyState message="No errors" />
      ) : (
        <ServiceErrorsTable errors={service.errors} />
      )}
    </ScrollablePage>
  )
}
