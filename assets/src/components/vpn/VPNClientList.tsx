import { Table } from '@pluralsh/design-system'
import { ColumnDef } from '@tanstack/react-table'

import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap'

import { VPNClientRow } from './columns'

interface VPNClientListProps {
  columns: Array<ColumnDef<VPNClientRow, any>>
  data: Array<VPNClientRow>
}

export default function VPNClientList({
  columns,
  data,
  ...props
}: VPNClientListProps) {
  if (!data || data.length === 0) {
    return <>No VPN clients available.</>
  }

  return (
    <FullHeightTableWrap>
      <Table
        data={data}
        columns={columns}
        maxHeight="unset"
        height="100%"
        {...props}
      />
    </FullHeightTableWrap>
  )
}
