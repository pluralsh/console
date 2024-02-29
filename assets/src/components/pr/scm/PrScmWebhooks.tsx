import { ComponentProps, useCallback, useMemo, useState } from 'react'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { VirtualItem } from '@tanstack/react-virtual'

import { useScmWebhooksQuery } from 'generated/graphql'
import { extendConnection } from 'utils/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { GqlError } from 'components/utils/Alert'
import {
  POLL_INTERVAL,
  useSetPageHeaderContent,
} from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_SCM_ABS_PATH } from 'routes/prRoutesConsts'

import { columns } from './PrScmWebhooksColumns'
import { CreateScmWebhook } from './CreateScmWebhook'
import { SetupDependencyAutomation } from './SetupDependencyAutomation'

export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const PR_QUERY_PAGE_SIZE = 100
export const SCM_WEBHOOKS_Q_VARS = {
  first: PR_QUERY_PAGE_SIZE,
}

export default function ScmWebhooks() {
  const theme = useTheme()
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...PR_BASE_CRUMBS,
        {
          label: 'SCM connections',
          url: PR_SCM_ABS_PATH,
        },
      ],
      []
    )
  )

  const queryResult = useScmWebhooksQuery({
    variables: SCM_WEBHOOKS_Q_VARS,
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const scmWebhooks = data?.ScmWebhooks
  const pageInfo = scmWebhooks?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: PR_QUERY_PAGE_SIZE,
    key: 'scmWebhooks',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(prev, fetchMoreResult.ScmWebhooks, 'ScmWebhooks'),
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetPageHeaderContent(
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.small,
      }}
    >
      <SetupDependencyAutomation refetch={refetch} />
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
          reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
          data={data?.ScmWebhooks?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </div>
  )
}
