import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useScmConnectionsQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_SCM_ABS_PATH } from 'routes/prRoutesConsts'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { columns } from './PrScmConnectionsColumns'
import { CreateScmConnection } from './CreateScmConnection'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

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
    keyPath: ['scmConnections'],
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
      <Table
        fullHeightWrap
        columns={columns}
        reactTableOptions={{ meta: { refetch } }}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        data={data?.scmConnections?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </div>
  )
}
