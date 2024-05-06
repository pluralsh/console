import { ComponentProps, useMemo, useState } from 'react'
import {
  LoopingLogo,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import Input2 from '@pluralsh/design-system/dist/components/Input2'

import { usePullRequestsQuery } from 'generated/graphql'

import { PR_BASE_CRUMBS, PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useThrottle } from 'components/hooks/useThrottle'

import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { prColumns } from './PrQueueColumns'

export const PRS_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const PR_QUERY_PAGE_SIZE = 100
const PR_STATUS_TAB_KEYS = ['ALL', 'OPEN', 'CLOSED'] as const

type PrStatusTabKey = (typeof PR_STATUS_TAB_KEYS)[number]

export default function OutstandingPrs() {
  const theme = useTheme()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 100)
  const [_statusFilter, _setStatusFilter] = useState<PrStatusTabKey>('ALL')

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...PR_BASE_CRUMBS,
        {
          label: 'outstanding PRs',
          url: PR_QUEUE_ABS_PATH,
        },
      ],
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
      queryHook: usePullRequestsQuery,
      pageSize: PR_QUERY_PAGE_SIZE,
      queryKey: 'pullRequests',
    },
    {
      q: debouncedSearchString,
    }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <div css={{ display: 'flex', minWidth: 0, gap: theme.spacing.medium }}>
        <Input2
          startIcon={<SearchIcon />}
          showClearButton
          value={searchString}
          onChange={(e) => setSearchString(e.currentTarget.value)}
          css={{ flexGrow: 1 }}
        />
      </div>
      <FullHeightTableWrap>
        <Table
          columns={prColumns}
          reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
          data={data?.pullRequests?.edges || []}
          virtualizeRows
          reactTableOptions={reactTableOptions}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
