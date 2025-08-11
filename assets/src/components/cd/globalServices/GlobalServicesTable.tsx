import { Flex, Input2, SearchIcon, Table } from '@pluralsh/design-system'
import type { Row } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import {
  type ServiceDeploymentsRowFragment,
  useGlobalServicesQuery,
} from 'generated/graphql'
import { ComponentProps, memo, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'

import { useProjectId } from 'components/contexts/ProjectsContext'

import { useThrottle } from 'components/hooks/useThrottle'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'

import { columns } from './GlobalServices'

function GlobalServicesTableComponent({
  setRefetch,
}: {
  setRefetch?: (refetch: () => () => void) => void
}) {
  const navigate = useNavigate()
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
        onRowClick={(
          _e,
          { original }: Row<Edge<ServiceDeploymentsRowFragment>>
        ) =>
          navigate(
            getGlobalServiceDetailsPath({ serviceId: original.node?.id })
          )
        }
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactTableOptions={reactTableOptions}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
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
