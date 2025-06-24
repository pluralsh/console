import { Code, EmptyState, Table } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'

import { createColumnHelper } from '@tanstack/react-table'
import { Body2P } from 'components/utils/typography/Text'
import { ServiceContextFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { useServiceContext } from './ServiceDetails'

const columnHelper = createColumnHelper<ServiceContextFragment>()

export function ServiceContexts() {
  const { service } = useServiceContext()

  if (isEmpty(service.contexts))
    return <EmptyState message="No contexts found." />

  return (
    <Table
      fullHeightWrap
      data={service?.contexts?.filter(isNonNullable) ?? []}
      columns={columns}
    />
  )
}

const columns = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Name',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      return <Body2P>{getValue()}</Body2P>
    },
  }),
  columnHelper.accessor('configuration', {
    id: 'configuration',
    header: 'Configuration',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      return (
        <Code
          css={{ maxHeight: '200px', overflow: 'auto' }}
          language="json"
          showHeader={false}
        >
          {JSON.stringify(getValue() ?? {}, null, 2)}
        </Code>
      )
    },
  }),
]
