import { LoopingLogo, Table } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useScmWebhooksQuery } from 'generated/graphql'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { CreateScmWebhook } from './CreateScmWebhook'
import { columns } from './ScmWebhooksColumns'

export const PR_QUERY_PAGE_SIZE = 100

export const SCM_WEBHOOKS_Q_VARS = {
  first: PR_QUERY_PAGE_SIZE,
}

export function ScmWebhooks() {
  const theme = useTheme()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useScmWebhooksQuery,
    pageSize: SCM_WEBHOOKS_Q_VARS.first,
    keyPath: ['scmWebhooks'],
  })

  useSetPageHeaderContent(
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.small,
      }}
    >
      <CreateScmWebhook refetch={refetch} />
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
        data={data?.scmWebhooks?.edges || []}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </div>
  )
}
