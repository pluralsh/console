import { ArrowTopRightIcon, Button, Table } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { usePrAutomationsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
import { SelfServiceSearchBar } from 'components/self-service/catalog/SelfServiceSearchBar'
import { useSelfServiceCatalogSearch } from 'components/self-service/catalog/useSelfServiceCatalogSearch'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const search = useSelfServiceCatalogSearch()
  const {
    hasActiveSearch,
    useSemanticSearch,
    useFallbackSearch,
    prAutomationIds,
    isSearchPending,
    debouncedSearchQuery,
  } = search

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
      q: useFallbackSearch ? debouncedSearchQuery : '',
    }
  )

  const prAutomations = useMemo(() => {
    const nodes = mapExistingNodes(data?.prAutomations)

    if (!hasActiveSearch) return nodes

    if (isSearchPending) return []

    if (!useSemanticSearch) return nodes

    const ids = new Set(prAutomationIds)
    return nodes.filter((prAutomation) => ids.has(prAutomation.id))
  }, [
    data?.prAutomations,
    hasActiveSearch,
    isSearchPending,
    prAutomationIds,
    useSemanticSearch,
  ])

  const allowPagination = !hasActiveSearch || useFallbackSearch

  if (error) return <GqlError error={error} />

  return (
    <>
      <SelfServiceSearchBar search={search} />
      <Table
        fullHeightWrap
        columns={columns}
        loading={(!data && loading) || (hasActiveSearch && isSearchPending)}
        reactTableOptions={{ meta: { refetch } }}
        data={prAutomations}
        virtualizeRows
        hasNextPage={allowPagination && pageInfo?.hasNextPage}
        fetchNextPage={allowPagination ? fetchNextPage : undefined}
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
