import { ComponentProps } from 'react'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useScmConnectionsQuery } from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { GqlError } from 'components/utils/Alert'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_SCM_ABS_PATH } from 'routes/prRoutesConsts'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { columns } from './PrScmConnectionsColumns'
import { CreateScmConnection } from './CreateScmConnection'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const PR_QUERY_PAGE_SIZE = 100

const crumbs = [
  ...PR_BASE_CRUMBS,
  {
    label: 'SCM connections',
    url: PR_SCM_ABS_PATH,
  },
]

export default function ScmConnections() {
  const theme = useTheme()

  useSetBreadcrumbs(crumbs)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useScmConnectionsQuery,
    pageSize: PR_QUERY_PAGE_SIZE,
    queryKey: 'scmConnections',
  })

  useSetPageHeaderContent(
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.small,
      }}
    >
      <SetupDependencyAutomation refetch={refetch} />
      <CreateScmConnection refetch={refetch} />
    </div>
  )

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
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.scmConnections?.edges || []}
          virtualizeRows
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
