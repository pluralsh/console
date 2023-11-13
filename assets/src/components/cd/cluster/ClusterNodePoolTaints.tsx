import { Modal, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { isNonNullable } from 'utils/isNonNullable'

import { TaintFragment } from '../../../generated/graphql'

const taintsColumnHelper = createColumnHelper<TaintFragment>()
const taintsColumns = [
  taintsColumnHelper.accessor((taint) => taint.key, {
    id: 'key',
    header: 'Key',
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }),
  taintsColumnHelper.accessor((taint) => taint.value, {
    id: 'value',
    header: 'Value',
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }),
  taintsColumnHelper.accessor((taint) => taint.effect, {
    id: 'effect',
    header: 'Effect',
    cell: function Cell({ getValue }) {
      return getValue()
    },
  }),
]

export function TaintsModal({
  open,
  onClose,
  taints,
  poolName,
}: {
  open: boolean
  onClose: () => void
  poolName: string
  taints: Nullable<Nullable<TaintFragment>[]>
}) {
  taints = taints?.filter(isNonNullable) || []

  return (
    <Modal
      portal
      header={`${poolName ? `${poolName} taints` : 'Taints'}`}
      open={open}
      onClose={onClose}
      size="large"
    >
      <Table
        columns={taintsColumns}
        data={taints}
        reactTableOptions={{ getRowId: (original, i) => original?.key || i }}
      />
    </Modal>
  )
}
