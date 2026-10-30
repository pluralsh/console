import { POLL_INTERVAL } from 'components/cluster/constants'
import { Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { GlobalServiceFragment } from 'generated/graphql'
import { GlobalServicesDocument } from 'generated/graphql-documents'
import { ComponentProps, memo, useEffect, useMemo } from 'react'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

import { useProjectId } from 'components/contexts/ProjectsContext'

import { useThrottle } from 'components/hooks/useThrottle'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { Link } from 'react-router-dom'
import { columns } from './GlobalServices'

function GlobalServicesTableComponent({
  searchString = '',
  setRefetch,
}: {
  searchString?: string
  setRefetch?: (refetch: () => () => void) => void
}) {
  const projectId = useProjectId()
  const debouncedSearchString = useThrottle(searchString.trim(), 100)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      pollInterval: POLL_INTERVAL,
      query: GlobalServicesDocument,
      keyPath: ['globalServices'],
    },
    { projectId, q: debouncedSearchString }
  )

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={data?.globalServices?.edges || []}
      columns={columns}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      reactTableOptions={reactTableOptions}
      onVirtualSliceChange={setVirtualSlice}
      getRowLink={({ original }) => {
        const { node } = original as Edge<GlobalServiceFragment>
        return (
          <Link to={getGlobalServiceDetailsPath({ serviceId: node?.id })} />
        )
      }}
      emptyStateProps={{
        message: debouncedSearchString
          ? `No results found for "${debouncedSearchString}"`
          : "Looks like you don't have any global services yet.",
      }}
    />
  )
}

export const GlobalServicesTable = memo(GlobalServicesTableComponent)
