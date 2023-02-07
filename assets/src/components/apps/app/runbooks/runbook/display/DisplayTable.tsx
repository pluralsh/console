import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { query } from 'components/runbooks/utils'
import { get } from 'lodash'
import { useContext, useMemo } from 'react'

import { DisplayContext } from '../RunbookDisplay'

const columnHelper = createColumnHelper<any>()

// Ignored column widths that are part of children object
// as design system table component scaling works really good here.
export function DisplayTable({
  attributes: {
    datasource, width, height, path,
  }, children,
}) {
  const { datasources } = useContext<any>(DisplayContext)
  const entries = path ? query(datasources[datasource], path) : datasources[datasource]
  const columns = useMemo(() => children.map(column => columnHelper.accessor(row => get(row, column.attributes.path, 'n/a'), {
    header: column.attributes.header,
    cell: (data: any) => data.getValue(),
  })), [children])

  return (
    <Table
      columns={columns}
      data={entries}
      width={width}
      height={height}
    />
  )
}
