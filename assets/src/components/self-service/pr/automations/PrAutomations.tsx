import { ArrowTopRightIcon, Button, Table } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import { usePrAutomationsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { useThrottle } from 'components/hooks/useThrottle'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
import { SelfServiceSearchBar } from 'components/self-service/catalog/SelfServiceSearchBar'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const [searchQuery, setSearchQuery] = useState('')
  const trimmedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useThrottle(trimmedSearchQuery, 300)
  const hasActiveSearch = !!trimmedSearchQuery

  useSetPageHeaderContent(
    useMemo(
      () => (
        <Button
          secondary
          as="a"
          href={PRA_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
          style={{ width: 'max-content' }}
        >
          Create automation
        </Button>
      ),
      []
    )
  )

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
      queryHook: usePrAutomationsQuery,
      keyPath: ['prAutomations'],
    },
    {
      q: debouncedSearchQuery,
    }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

  if (error) return <GqlError error={error} />

  return (
    <>
      <SelfServiceSearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      <Table
        fullHeightWrap
        columns={columns}
        loading={!data && loading}
        reactTableOptions={{ meta: { refetch } }}
        data={prAutomations}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{
          message: hasActiveSearch
            ? 'There are no PR automations matching your search.'
            : 'No PR automations found.',
        }}
      />
    </>
  )
}
