import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { useScmWebhooksQuery } from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { GqlError } from 'components/utils/Alert'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_SCM_WEBHOOKS_ABS_PATH } from 'routes/prRoutesConsts'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { columns } from './ScmWebhooksColumns'
import { CreateScmWebhook } from './CreateScmWebhook'

export const PR_QUERY_PAGE_SIZE = 100

const crumbs = [
  ...PR_BASE_CRUMBS,
  {
    label: 'SCM webhooks',
    url: PR_SCM_WEBHOOKS_ABS_PATH,
  },
]

export const SCM_WEBHOOKS_Q_VARS = {
  first: PR_QUERY_PAGE_SIZE,
}

export default function ScmWebhooks() {
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
      <FullHeightTableWrap>
        <Table
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
      </FullHeightTableWrap>
    </div>
  )
}
