import { ArrowTopRightIcon, Button, Flex, Table } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import { usePrAutomationsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import {
  PageToolbarPortal,
  ToolbarSearchInput,
} from 'components/layout/PageToolbar'

import { useThrottle } from 'components/hooks/useThrottle'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString.trim(), 200)
  const hasActiveSearch = !!searchString.trim()

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
    { q: debouncedSearchString }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

  return (
    <>
      <PageToolbarPortal>
        <ToolbarSearchInput
          placeholder="Search PR automations"
          value={searchString}
          onChange={setSearchString}
        />
        <Button
          secondary
          small
          as="a"
          href={PRA_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          Create automation
        </Button>
      </PageToolbarPortal>
      {error ? (
        <GqlError error={error} />
      ) : (
        <Flex
          direction="column"
          height="100%"
          overflow="hidden"
        >
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
        </Flex>
      )}
    </>
  )
}
