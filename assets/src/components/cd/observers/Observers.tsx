import { ComponentProps } from 'react'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { type Row, createColumnHelper } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { OBSERVERS_ABS_PATH } from 'routes/cdRoutesConsts'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { ObserverFragment, useObserversQuery } from 'generated/graphql'
import { Edge } from 'utils/graphql'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'
import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'
import { useProjectId } from '../../contexts/ProjectsContext'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

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
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(({ node }) => node?.status, {
    id: 'status',
    header: 'Status',
    meta: { truncate: true },
    cell: ({ getValue }) => getValue(), // TODO
  }),
  columnHelper.accessor(({ node }) => node?.lastRunAt, {
    id: 'lastRunAt',
    header: 'Last run',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ node }) => node?.target, {
    id: 'target',
    header: 'Target',
    cell: ({ getValue }) => getValue(), // TODO
  }),
  columnHelper.accessor(({ node }) => node?.errors, {
    id: 'errors',
    header: 'Errors',
    cell: ({ getValue }) => getValue(), // TODO
  }),
  columnHelper.accessor(({ node }) => node, {
    id: 'actions',
    header: '',
    meta: { gridTemplate: 'minmax(auto, 80px)' },
    cell: ({ getValue }) => getValue(), // TODO
  }),
]

export default function Observers() {
  const navigate = useNavigate()
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
        onRowClick={(_e, { original }: Row<Edge<ObserverFragment>>) => {
          navigate(`${OBSERVERS_ABS_PATH}/${original.node?.id}`)
        }}
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
