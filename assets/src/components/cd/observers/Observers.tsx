import { ComponentProps, useState } from 'react'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { OBSERVERS_ABS_PATH } from 'routes/cdRoutesConsts'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { ObserverFragment, useObserversQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'
import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'
import { useProjectId } from '../../contexts/ProjectsContext'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from '../services/ServicesTableErrors'

import ObserverStatusChip from './ObserverStatusChip'

export const breadcrumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'observers', url: OBSERVERS_ABS_PATH },
]

const pageSize = 100

const virtualOptions: ComponentProps<typeof Table>['reactVirtualOptions'] = {
  overscan: 10,
}

const columnHelper = createColumnHelper<Edge<ObserverFragment>>()

const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Name',
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.crontab, {
    id: 'crontab',
    header: 'Crontab',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => <ObserverStatusChip status={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.lastRunAt, {
    id: 'lastRunAt',
    header: 'Last run',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.target, {
    id: 'target',
    header: 'Target',
    cell: () => '', // TODO
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'errors',
    header: 'Errors',
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      const [open, setOpen] = useState(false)

      if (!node || !node.errors) return null

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <ServiceErrorsChip
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
            }}
            clickable
            errors={node.errors}
          />
          <ServiceErrorsModal
            isOpen={open}
            setIsOpen={setOpen}
            header={`${node.name} observer errors`}
            errors={node.errors}
          />
        </div>
      )
    },
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: 'minmax(auto, 80px)' },
    cell: () => '', // TODO
  }),
]

export default function Observers() {
  const projectId = useProjectId()

  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      { queryHook: useObserversQuery, pageSize, keyPath: ['observers'] },
      { projectId }
    )

  useSetBreadcrumbs(breadcrumbs)

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <FullHeightTableWrap>
      <Table
        columns={columns}
        reactVirtualOptions={virtualOptions}
        data={data?.observers?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        emptyStateProps={{
          message: "Looks like you don't have any observers yet",
        }}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
