import { ComponentProps, useState } from 'react'
import {
  Chip,
  IconFrame,
  InfoOutlineIcon,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { ClusterCondition, ClustersRowFragment } from 'generated/graphql'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { toDateOrUndef } from 'utils/date'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { TableText } from 'components/cluster/TableElements'
import { isEmpty } from 'lodash'

function ClusterConditionsButton({
  ...props
}: Partial<ComponentProps<typeof IconFrame>>) {
  const theme = useTheme()

  return (
    <IconFrame
      type="floating"
      icon={<InfoOutlineIcon color={theme.colors['icon-light']} />}
      tooltip="View cluster conditions"
      clickable
      {...props}
    />
  )
}

const columnHelper = createColumnHelper<Nullable<ClusterCondition>>()

export const ColSource = columnHelper.accessor((row) => row?.type, {
  id: 'type',
  header: 'Type',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
})

export const ColStatus = columnHelper.accessor((row) => row?.status, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  cell: ({ getValue }) => {
    const status = getValue()
    const lStatus = status?.toLowerCase()

    return (
      status && (
        <Chip
          severity={
            lStatus === 'true'
              ? 'success'
              : lStatus === 'false'
              ? 'danger'
              : 'neutral'
          }
        >
          {status}
        </Chip>
      )
    )
  },
})
export const ColReason = columnHelper.accessor((row) => row?.reason, {
  id: 'reason',
  header: 'Reason',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
})
export const ColSeverity = columnHelper.accessor((row) => row?.severity, {
  id: 'severity',
  header: 'Severity',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
})
export const ColMessage = columnHelper.accessor((row) => row?.message, {
  id: 'message',
  header: 'Message',
  enableSorting: true,
  cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
})
export const ColLastTransitionTime = columnHelper.accessor(
  (row) => toDateOrUndef(row?.lastTransitionTime),
  {
    id: 'lastTransitionTime',
    header: 'Last transition time',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ getValue }) => (
      <DateTimeCol dateString={getValue()?.toISOString()} />
    ),
  }
)

const columns = [
  ColSource,
  ColStatus,
  ColReason,
  ColSeverity,
  ColMessage,
  ColLastTransitionTime,
]

export function ClusterConditions({
  cluster,
}: {
  cluster: Nullable<Pick<ClustersRowFragment, 'name' | 'id' | 'status'>>
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (isEmpty(cluster?.status?.conditions)) {
    return null
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ClusterConditionsButton onClick={() => setIsOpen(true)} />
      <ModalMountTransition open={isOpen}>
        <Modal
          portal
          size="large"
          open={isOpen}
          header={`Cluster conditions${
            cluster?.name ? ` – ${cluster?.name}` : ''
          }`}
          width={1024}
          maxWidth={1024}
          onClose={() => setIsOpen(false)}
        >
          <ClusterConditionsTable cluster={cluster} />
        </Modal>
      </ModalMountTransition>
    </div>
  )
}

export function ClusterConditionsTable({
  cluster,
}: {
  cluster: Nullable<ClustersRowFragment>
}) {
  return (
    <Table
      columns={columns}
      data={cluster?.status?.conditions || []}
      reactTableOptions={{
        getRowId(originalRow, i) {
          return originalRow.type ?? i
        },
      }}
    />
  )
}
