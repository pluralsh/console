import {
  IconFrame,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
} from '@pluralsh/design-system'
import { ReactNode, useEffect, useState } from 'react'
import {
  AiInsight,
  AiPinEdge,
  ChatThread,
  CreateAiPinMutation,
  useAiPinsQuery,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from '../../generated/graphql.ts'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData.tsx'

interface AIPinButtonProps {
  insight?: AiInsight
  thread?: ChatThread
}

export default function AIPinButton({
  insight,
  thread,
}: AIPinButtonProps): ReactNode {
  const [pinned, setPinned] = useState<AiPinEdge>(null)
  const name =
    insight?.text?.substring(0, 250) ?? thread?.summary?.substring(0, 250) ?? ''
  const [createPin, { loading: pinCreating }] = useCreateAiPinMutation({
    variables: {
      attributes: {
        threadId: thread?.id,
        insightId: insight?.id,
        name: name,
      },
    },
    awaitRefetchQueries: true,
    refetchQueries: ['AIPins'],
  })
  const [deletePin, { loading: pinDeleting }] = useDeleteAiPinMutation({
    variables: {
      id: pinned?.node?.id,
    },
    awaitRefetchQueries: true,
    refetchQueries: ['AIPins'],
  })
  const {
    data: pins,
    loading,
    pageInfo,
    fetchNextPage,
  } = useFetchPaginatedData({
    queryHook: useAiPinsQuery,
    keyPath: ['aiPins'],
    pollInterval: 10_000,
  })

  useEffect(() => {
    if (loading) return

    const pin = pins?.aiPins?.edges?.find(
      (pin: AiPinEdge) =>
        (!!thread && pin?.node?.thread?.id === thread?.id) ||
        (!!insight && pin?.node?.insight?.id === insight?.id)
    )

    if (!pin && pageInfo?.hasNextPage) {
      fetchNextPage()
      return
    }

    setPinned(pin)
  }, [pins?.aiPins, pageInfo, loading, thread, insight, fetchNextPage])

  if (!insight && !thread) {
    return null
  }

  return (
    <IconFrame
      clickable
      type="secondary"
      size="large"
      onClick={!!pinned ? deletePin : createPin}
      icon={
        pinCreating || pinDeleting ? (
          <Spinner
            css={{
              width: 16,
              height: 16,
              '&::before': {
                width: 16,
                height: 16,
                marginTop: -8,
                marginLeft: -8,
              },
            }}
          />
        ) : !!pinned ? (
          <PushPinFilledIcon
            css={{
              width: 16,
            }}
          />
        ) : (
          <PushPinOutlineIcon
            css={{
              width: 16,
            }}
          />
        )
      }
    />
  )
}
