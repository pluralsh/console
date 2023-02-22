import { Table } from '@pluralsh/design-system'
import { ColumnDef } from '@tanstack/react-table'

import { VPNClientRow } from './columns'

interface VPNClientListProps {
  columns: Array<ColumnDef<VPNClientRow, any>>
  data: Array<VPNClientRow>
}

export default function VPNClientList({ columns, data, ...props }: VPNClientListProps) {
  if (!data || data.length === 0) {
    return <>No VPN clients available.</>
  }

  return (
    <Table
      data={data}
      columns={columns}
      virtualizeRows
      {...props}
    />
  )
}
