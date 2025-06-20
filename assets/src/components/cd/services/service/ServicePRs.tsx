import {
  EmptyState,
  Input,
  LoopingLogo,
  SearchIcon,
  Table,
} from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { usePullRequestsQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { useThrottle } from 'components/hooks/useThrottle'

export const columns = [
  ColTitle,
  ColStatus,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]

export default function ServicePRs() {
  const theme = useTheme()
  const { serviceId } = useParams()

  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 200)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: usePullRequestsQuery, keyPath: ['pullRequests'] },
    { q: debouncedSearchString, serviceId }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (error) return <GqlError error={error} />
  if (!data) return <LoopingLogo />

  return (
    <ScrollablePage
      scrollable={false}
      heading="Pull requests"
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexShrink: 0,
          }}
        >
          <Input
            placeholder="Search"
            startIcon={<SearchIcon />}
            showClearButton
            value={searchString}
            onChange={(e) => setSearchString(e.currentTarget.value)}
            css={{ flexGrow: 1 }}
          />
        </div>
        {isEmpty(data?.pullRequests?.edges) ? (
          <EmptyState message="No pull requests found" />
        ) : (
          <Table
            fullHeightWrap
            columns={columns}
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            data={data?.pullRequests?.edges || []}
            virtualizeRows
            reactTableOptions={reactTableOptions}
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
          />
        )}
      </div>
    </ScrollablePage>
  )
}
