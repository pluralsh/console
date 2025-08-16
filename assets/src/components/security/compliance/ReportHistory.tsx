import {
  Button,
  Flex,
  IconFrame,
  ListIcon,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { createColumnHelper } from '@tanstack/react-table'
import { Edge } from '../../../utils/graphql.ts'
import {
  ComplianceReportFragment,
  useComplianceReportsQuery,
} from '../../../generated/graphql.ts'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData.tsx'
import { GqlError } from '../../utils/Alert.tsx'

const columnHelper = createColumnHelper<Edge<ComplianceReportFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Report name',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.sha256, {
    id: 'sha256',
    header: 'SHA256',
    meta: { truncate: true },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.insertedAt, {
    id: 'insertedAt',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export function ReportHistoryModal({
  name,
  open,
  onClose,
}: {
  name: string
  open: boolean
  onClose: Nullable<() => void>
}) {
  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useComplianceReportsQuery,
        keyPath: ['complianceReportGenerator', 'complianceReports'],
      },
      { name }
    )

  if (error) return <GqlError error={error} />

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={'large'}
      header={
        <Flex
          align={'center'}
          justify={'space-between'}
        >
          Report history
          <Button
            secondary
            small
            onClick={() => onClose?.()}
          >
            Close
          </Button>
        </Flex>
      }
      css={{ maxHeight: '75vh' }}
    >
      <Table
        fillLevel={2}
        fullHeightWrap
        virtualizeRows
        data={data?.complianceReportGenerator?.complianceReports?.edges || []}
        loading={!data && loading}
        columns={columns}
        hasNextPage={
          data?.complianceReportGenerator?.complianceReports?.pageInfo
            ?.hasNextPage
        }
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        fetchNextPage={fetchNextPage}
      />
    </Modal>
  )
}

export function ReportHistory({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        tooltip={'View report history'}
        clickable
        onClick={() => setOpen(true)}
        icon={<ListIcon />}
        type={'floating'}
      />
      <ModalMountTransition open={open}>
        <ReportHistoryModal
          name={name}
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
