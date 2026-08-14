import { Button, ButtonProps, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useCloudConnectionsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH } from 'routes/settingsRoutesConst'
import { mapExistingNodes } from 'utils/graphql'
import { getCloudConnectionColumns } from './CloudConnectionsColumns'

const CLOUD_CONNECTIONS_PAGE_SIZE = 25

export function CloudConnectionsList() {
  const {
    data,
    loading,
    error,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
    refetch,
  } = useFetchPaginatedData({
    queryHook: useCloudConnectionsQuery,
    keyPath: ['cloudConnections'],
    pageSize: CLOUD_CONNECTIONS_PAGE_SIZE,
    fetchPolicy: 'cache-and-network',
  })

  const connections = useMemo(
    () => mapExistingNodes(data?.cloudConnections),
    [data?.cloudConnections]
  )
  const columns = useMemo(
    () => getCloudConnectionColumns({ refetch }),
    [refetch]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      loose
      fullHeightWrap
      virtualizeRows
      data={connections}
      columns={columns}
      loading={loading && !data}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{
        message: 'No cloud connections found.',
        children: <AddCloudConnectionButton />,
      }}
    />
  )
}

export function AddCloudConnectionButton({
  buttonProps,
}: {
  buttonProps?: ButtonProps
}) {
  return (
    <Button
      as={Link}
      to={CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH}
      height="fit-content"
      {...buttonProps}
    >
      Add cloud connection
    </Button>
  )
}
