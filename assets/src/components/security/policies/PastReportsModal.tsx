import {
  Button,
  IconFrame,
  ListIcon,
  LoopingLogo,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData.tsx'
import {
  ComplianceReportFragment,
  useComplianceReportsQuery,
} from '../../../generated/graphql.ts'
import { createColumnHelper } from '@tanstack/react-table'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import { GqlError } from '../../utils/Alert.tsx'
import { Edge } from '../../../utils/graphql.ts'

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

export function PastReportsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useComplianceReportsQuery,
      keyPath: ['complianceReports'],
    })

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="custom"
      header="Past reports"
      actions={
        <Button
          secondary
          onClick={() => onClose?.()}
          flexGrow={1}
        >
          Close
        </Button>
      }
      css={{ maxHeight: '80vh' }}
    >
      <Table
        fillLevel={1}
        fullHeightWrap
        virtualizeRows
        data={data?.complianceReports?.edges || []}
        loading={!data && loading}
        columns={columns}
        hasNextPage={data?.complianceReports?.pageInfo?.hasNextPage}
        isFetchingNextPage={loading}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
        fetchNextPage={fetchNextPage}
      />
    </Modal>
  )
}

export function PastReportsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        type={'floating'}
        size={'large'}
        icon={<ListIcon />}
        css={{ height: 42, width: 42 }}
        clickable
        onClick={() => setOpen(true)}
      />
      <ModalMountTransition open={open}>
        <PastReportsModal
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
