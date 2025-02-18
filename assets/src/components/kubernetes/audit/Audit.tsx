import { Table } from '@pluralsh/design-system'
import { CellContext, createColumnHelper } from '@tanstack/react-table'
import { useEffect, useMemo } from 'react'
import {
  ClusterAuditLog,
  useKubernetesClusterAuditLogsQuery,
} from '../../../generated/graphql.ts'
import { GqlError } from '../../utils/Alert.tsx'
import { ScrollablePage } from '../../utils/layout/ScrollablePage.tsx'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData.tsx'
import UserInfo from '../../utils/UserInfo.tsx'
import { useCluster } from '../Cluster.tsx'
import { useDataSelect } from '../common/DataSelect.tsx'

const columnHelper = createColumnHelper<ClusterAuditLog>()

const RawColumn = ({ getValue }: CellContext<any, string>): string => getValue()

const pathColumn = columnHelper.accessor((log) => log?.path, {
  id: 'path',
  header: 'Path',
  enableSorting: true,
  cell: RawColumn,
})

const methodColumn = columnHelper.accessor((log) => log?.method, {
  id: 'method',
  header: 'Method',
  enableSorting: true,
  cell: RawColumn,
})

const insertedAtColumn = columnHelper.accessor((log) => log?.insertedAt, {
  id: 'timestamp',
  header: 'Timestamp',
  enableSorting: true,
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

const userColumn = columnHelper.accessor((log) => log?.actor, {
  id: 'user',
  header: 'User',
  enableSorting: true,
  cell: ({ getValue }) => <UserInfo user={getValue() ?? {}} />,
})

const columns = [methodColumn, pathColumn, userColumn, insertedAtColumn]

export default function Audit() {
  const cluster = useCluster()
  const { setEnabled } = useDataSelect()

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        skip: !cluster?.id,
        queryHook: useKubernetesClusterAuditLogsQuery,
        keyPath: ['auditLogs'],
        pollInterval: 30_000,
      },
      {
        clusterId: cluster?.id,
      }
    )

  useEffect(() => {
    // Disable data select on audit page
    setEnabled(false)
  })

  const auditLogs = useMemo(
    () => data?.cluster?.auditLogs?.edges?.map((edge) => edge?.node),
    [data]
  )

  return (
    <ScrollablePage
      fullWidth
      scrollable={false}
    >
      {error && <GqlError error={error} />}
      <Table
        fullHeightWrap
        data={auditLogs ?? []}
        columns={columns}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        virtualizeRows
        onVirtualSliceChange={setVirtualSlice}
      />
    </ScrollablePage>
  )
}
