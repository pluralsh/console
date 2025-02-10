import { LoopingLogo, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ReactNode } from 'react'
import {
  ClusterIsoImageEdge,
  useClusterIsoImagesQuery,
} from '../../../generated/graphql.ts'
import { ObscuredToken } from '../../profile/ObscuredToken.tsx'
import { GqlError } from '../../utils/Alert.tsx'
import CopyButton from '../../utils/CopyButton.tsx'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData.tsx'

const columnHelper = createColumnHelper<ClusterIsoImageEdge>()

const columns = [
  columnHelper.accessor((edge) => edge?.node, {
    id: 'image',
    header: 'Image',
    meta: { truncate: true, gridTemplate: 'minmax(150px, 1fr)' },
    cell: ({ getValue }) => getValue()?.image,
  }),
  columnHelper.accessor((edge) => edge?.node, {
    id: 'registry',
    header: 'Registry',
    meta: { truncate: true, gridTemplate: 'minmax(150px, 1fr)' },
    cell: ({ getValue }) => getValue()?.registry,
  }),
  columnHelper.accessor((edge) => edge?.node, {
    id: 'user',
    header: 'SSH User',
    meta: { truncate: true, gridTemplate: 'minmax(125px, .75fr)' },
    cell: ({ getValue }) => getValue()?.user,
  }),
  columnHelper.accessor((edge) => edge?.node, {
    id: 'password',
    header: 'SSH Password',
    meta: { gridTemplate: 'minmax(125px, .75fr)' },
    cell: ({ getValue }) => (
      <div
        css={{
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <ObscuredToken
          token={getValue()?.password}
          length={12}
        />
        <CopyButton
          text={getValue()?.password ?? ''}
          tooltip="Copy value"
          type="tertiary"
        />
      </div>
    ),
  }),
  columnHelper.accessor((edge) => edge?.node?.project, {
    id: 'project',
    header: 'Project',
    meta: { truncate: true, gridTemplate: 'minmax(100px, .5fr)' },
    cell: ({ getValue }) => getValue()?.name,
  }),
  columnHelper.accessor((edge) => edge?.node?.insertedAt, {
    id: 'created',
    header: 'Created',
    meta: { truncate: true, gridTemplate: 'minmax(100px, .5fr)' },
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Images(): ReactNode {
  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      pollInterval: 30_000,
      queryHook: useClusterIsoImagesQuery,
      keyPath: ['clusterIsoImages'],
    })

  if (error) return <GqlError error={error} />
  if (!data) return <LoopingLogo />

  return (
    <Table
      fullHeightWrap
      data={(data?.clusterIsoImages?.edges as Array<ClusterIsoImageEdge>) ?? []}
      columns={columns}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      virtualizeRows
      emptyStateProps={{
        message: 'No images found',
      }}
    />
  )
}
