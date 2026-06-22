import { Button, ButtonProps, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  useFetchPaginatedData,
  type VirtualSlice,
} from 'components/utils/table/useFetchPaginatedData'
import {
  IssueWebhookFragment,
  ObservabilityWebhookFragment,
  useIssueWebhooksQuery,
  useObservabilityWebhooksQuery,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { WEBHOOKS_SETTINGS_CREATE_ABS_PATH } from 'routes/settingsRoutesConst'
import { mapExistingNodes } from 'utils/graphql'

import { getWebhookColumns } from './WebhooksColumns'

const WEBHOOKS_PAGE_SIZE = 25
const WEBHOOKS_POLLING_INTERVAL = 10_000

export type WebhookListItem =
  | {
      kind: WorkbenchJobActivityType.Observability
      webhook: ObservabilityWebhookFragment
    }
  | {
      kind: WorkbenchJobActivityType.Ticketing
      webhook: IssueWebhookFragment
    }

export function WebhooksList() {
  const {
    data: observabilityData,
    loading: observabilityLoading,
    error: observabilityError,
    pageInfo: observabilityPageInfo,
    fetchNextPage: fetchNextObservabilityPage,
    setVirtualSlice: setObservabilityVirtualSlice,
    refetch: refetchObservability,
  } = useFetchPaginatedData({
    queryHook: useObservabilityWebhooksQuery,
    keyPath: ['observabilityWebhooks'],
    pageSize: WEBHOOKS_PAGE_SIZE,
    fetchPolicy: 'cache-and-network',
    pollInterval: WEBHOOKS_POLLING_INTERVAL,
  })
  const {
    data: issueData,
    loading: issueLoading,
    error: issueError,
    pageInfo: issuePageInfo,
    fetchNextPage: fetchNextIssuePage,
    setVirtualSlice: setIssueVirtualSlice,
    refetch: refetchIssue,
  } = useFetchPaginatedData({
    queryHook: useIssueWebhooksQuery,
    keyPath: ['issueWebhooks'],
    pageSize: WEBHOOKS_PAGE_SIZE,
    fetchPolicy: 'cache-and-network',
    pollInterval: WEBHOOKS_POLLING_INTERVAL,
  })

  const observabilityWebhooks = useMemo(
    () =>
      mapExistingNodes(observabilityData?.observabilityWebhooks).map(
        (webhook) => ({
          kind: WorkbenchJobActivityType.Observability as const,
          webhook,
        })
      ),
    [observabilityData?.observabilityWebhooks]
  )
  const issueWebhooks = useMemo(
    () =>
      mapExistingNodes(issueData?.issueWebhooks).map((webhook) => ({
        kind: WorkbenchJobActivityType.Ticketing as const,
        webhook,
      })),
    [issueData?.issueWebhooks]
  )
  const webhooks = useMemo<WebhookListItem[]>(
    () => [...observabilityWebhooks, ...issueWebhooks],
    [issueWebhooks, observabilityWebhooks]
  )

  const handleVirtualSliceChange = useCallback(
    (slice: VirtualSlice) => {
      const observabilityLength = observabilityWebhooks.length

      setObservabilityVirtualSlice(
        getListVirtualSlice(slice, {
          startIndex: 0,
          endIndex: observabilityLength - 1,
          offset: 0,
        })
      )
      setIssueVirtualSlice(
        getListVirtualSlice(slice, {
          startIndex: observabilityLength,
          endIndex: observabilityLength + issueWebhooks.length - 1,
          offset: observabilityLength,
        })
      )
    },
    [
      issueWebhooks.length,
      observabilityWebhooks.length,
      setIssueVirtualSlice,
      setObservabilityVirtualSlice,
    ]
  )

  const loading = observabilityLoading || issueLoading
  const error = observabilityError || issueError
  const hasNextPage =
    observabilityPageInfo?.hasNextPage || issuePageInfo?.hasNextPage
  const fetchNextPage = useCallback(() => {
    if (observabilityPageInfo?.hasNextPage) fetchNextObservabilityPage()
    if (issuePageInfo?.hasNextPage) fetchNextIssuePage()
  }, [
    fetchNextIssuePage,
    fetchNextObservabilityPage,
    issuePageInfo?.hasNextPage,
    observabilityPageInfo?.hasNextPage,
  ])
  const columns = useMemo(
    () => getWebhookColumns({ refetchIssue, refetchObservability }),
    [refetchIssue, refetchObservability]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      loose
      fullHeightWrap
      virtualizeRows
      data={webhooks}
      columns={columns}
      loading={loading && (!observabilityData || !issueData)}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={handleVirtualSliceChange}
      emptyStateProps={{
        message: 'No webhooks found.',
        children: <CreateWebhookButton />,
      }}
    />
  )
}

function getListVirtualSlice(
  slice: VirtualSlice,
  {
    startIndex,
    endIndex,
    offset,
  }: {
    startIndex: number
    endIndex: number
    offset: number
  }
): VirtualSlice {
  const start = slice.start?.index ?? 0
  const end = slice.end?.index ?? start
  const overlapStart = Math.max(start, startIndex)
  const overlapEnd = Math.min(end, endIndex)

  if (overlapStart > overlapEnd) return { start: undefined, end: undefined }

  return {
    start: slice.start
      ? {
          ...slice.start,
          index: overlapStart - offset,
          key: `${overlapStart - offset}`,
        }
      : undefined,
    end: slice.end
      ? {
          ...slice.end,
          index: overlapEnd - offset,
          key: `${overlapEnd - offset}`,
        }
      : undefined,
  }
}

export function CreateWebhookButton({
  buttonProps,
}: {
  buttonProps?: ButtonProps
}) {
  return (
    <Button
      as={Link}
      to={WEBHOOKS_SETTINGS_CREATE_ABS_PATH}
      height="fit-content"
      {...buttonProps}
    >
      Create webhook
    </Button>
  )
}
