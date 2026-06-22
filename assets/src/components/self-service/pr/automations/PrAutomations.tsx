import {
  ArrowTopRightIcon,
  Button,
  Flex,
  Input2,
  SearchIcon,
  Table,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'

import { usePrAutomationsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { useThrottle } from 'components/hooks/useThrottle'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString.trim(), 200)
  const hasActiveSearch = !!searchString.trim()

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
    { q: debouncedSearchString }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
      overflow="hidden"
    >
      <Input2
        placeholder="Search PR automations"
        startIcon={<SearchIcon />}
        showClearButton
        value={searchString}
        onChange={(e) => setSearchString(e.currentTarget.value)}
        css={{ flexGrow: 1 }}
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
    </Flex>
  )
}
