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

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { useThrottle } from 'components/hooks/useThrottle'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const { colors } = useTheme()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 300)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: usePrAutomationsQuery, keyPath: ['prAutomations'] },
    { q: debouncedSearchString }
  )

  const prAutomations = useMemo(
    () => mapExistingNodes(data?.prAutomations),
    [data?.prAutomations]
  )

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
        >
          Create automation
        </Button>
      ),
      []
    )
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      overflow="hidden"
      direction="column"
      gap="small"
    >
      <Input2
        showClearButton
        placeholder="Search PR automations"
        startIcon={<SearchIcon />}
        value={searchString}
        onChange={(e) => setSearchString(e.currentTarget.value)}
        css={{ background: colors['fill-one'] }}
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
      />
    </Flex>
  )
}
