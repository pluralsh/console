import { ArrowTopRightIcon, Button, Table } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { usePrAutomationsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
import { columns } from './PrAutomationsColumns'

export const PRA_DOCS_URL = 'https://docs.plural.sh/deployments/pr/crds'

export function PrAutomations() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: usePrAutomationsQuery,
    keyPath: ['prAutomations'],
  })

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
    <Table
      fullHeightWrap
      columns={columns}
      loading={!data && loading}
      reactTableOptions={{ meta: { refetch } }}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      data={prAutomations}
      virtualizeRows
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
    />
  )
}
