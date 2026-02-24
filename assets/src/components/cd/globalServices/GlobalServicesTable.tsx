import { Flex, Input2, SearchIcon, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  GlobalServiceFragment,
  useGlobalServicesQuery,
} from 'generated/graphql'
import { ComponentProps, memo, useEffect, useMemo, useState } from 'react'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

import { useProjectId } from 'components/contexts/ProjectsContext'

import { useThrottle } from 'components/hooks/useThrottle'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { Link } from 'react-router-dom'
import { columns } from './GlobalServices'

function GlobalServicesTableComponent({
  setRefetch,
}: {
  setRefetch?: (refetch: () => () => void) => void
}) {
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useGlobalServicesQuery, keyPath: ['globalServices'] },
    { projectId, q: debouncedSearchString }
  )

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(() => ({ meta: { refetch } }), [refetch])

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Input2
        showClearButton
        placeholder="Search global services"
        startIcon={<SearchIcon />}
        value={searchString}
        onChange={(e) => setSearchString(e.currentTarget.value)}
      />
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
    </Flex>
  )
}

export const GlobalServicesTable = memo(GlobalServicesTableComponent)
