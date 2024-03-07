import { ComponentProps, useCallback, useMemo, useState } from 'react'
import {
  Button,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { VirtualItem } from '@tanstack/react-virtual'

import { useNotificationSinksQuery } from 'generated/graphql'
import { extendConnection } from 'utils/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { GqlError } from 'components/utils/Alert'

import {
  POLL_INTERVAL,
  useSetPageHeaderContent,
} from 'components/cd/ContinuousDeployment'

import { PR_BASE_CRUMBS, PR_QUEUE_ABS_PATH } from 'routes/prRoutesConsts'

import { columns } from './NotificationRoutersColumns'

const DOCS_URL = 'https://docs.plural.sh/deployments/operator/pr-automations'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

const QUERY_PAGE_SIZE = 100

export default function AutomationPr() {
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
          label: 'outstanding PRs',
          url: PR_QUEUE_ABS_PATH,
        },
      ],
      []
    )
  )

  return <div>TODO</div>
}
/*
  const queryResult = useNotificationSinksQuery({
    variables: {
      first: QUERY_PAGE_SIZE,
    },
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
  const notificationRouters = data?.notificationRouters
  const pageInfo = notificationRouters?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: QUERY_PAGE_SIZE,
    key: 'notificationRouters',
    interval: POLL_INTERVAL,
  })
  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.notificationRouters,
          'notificationRouters'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  useSetPageHeaderContent(
    useMemo(
      () => (
        <Button
          primary
          as="a"
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          New router
        </Button>
      ),
      []
    )
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
          data={data?.notificationRouters?.edges || []}
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
*/
