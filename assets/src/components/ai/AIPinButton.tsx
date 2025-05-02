import {
  IconFrame,
  PushPinFilledIcon,
  PushPinOutlineIcon,
  Spinner,
} from '@pluralsh/design-system'
import {
  AiInsightFragment,
  AiPinDocument,
  ChatThreadTinyFragment,
  useAiPinQuery,
  useCreateAiPinMutation,
  useDeleteAiPinMutation,
} from '../../generated/graphql.ts'
import { useCallback } from 'react'

type AIPinButtonProps = {
  insight?: Nullable<AiInsightFragment>
  thread?: Nullable<ChatThreadTinyFragment>
  size?: 'medium' | 'large'
}

export function useAiPin({
  insight,
  thread,
}: {
  insight?: Nullable<AiInsightFragment>
  thread?: Nullable<ChatThreadTinyFragment>
}): {
  isPinned: boolean
  pinCreating: boolean
  pinDeleting: boolean
  handlePin: (onCompleted?: () => void) => void
} {
  const name =
    insight?.text?.substring(0, 250) ?? thread?.summary?.substring(0, 250) ?? ''
  const pinIDs = thread
    ? { threadId: thread.id }
    : insight
      ? { insightId: insight.id }
      : {}
  const [createPin, { loading: pinCreating }] = useCreateAiPinMutation({
    variables: {
      attributes: {
        ...pinIDs,
        name,
      },
    },
    awaitRefetchQueries: true,
    refetchQueries: [{ query: AiPinDocument, variables: pinIDs }, 'AIPins'],
  })
  const [deletePin, { loading: pinDeleting }] = useDeleteAiPinMutation({
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: AiPinDocument, variables: pinIDs, errorPolicy: 'all' },
      'AIPins',
    ],
  })

  const { data: pin } = useAiPinQuery({
    variables: pinIDs,
    skip: !thread && !insight,
  })

  const isPinned = !!pin?.aiPin?.id

  const handlePin = useCallback(
    (onCompleted?: () => void) => {
      if (pinCreating || pinDeleting) return
      if (isPinned)
        deletePin({
          variables: { id: pin?.aiPin?.id ?? '' },
          onCompleted,
          errorPolicy: 'ignore',
        })
      else createPin({ onCompleted, errorPolicy: 'ignore' })
    },
    [pinCreating, pinDeleting, isPinned, deletePin, pin?.aiPin?.id, createPin]
  )

  return {
    isPinned,
    pinCreating,
    pinDeleting,
    handlePin,
  }
}

export function AIPinButton({
  insight,
  thread,
  size = 'large',
}: AIPinButtonProps) {
  const { isPinned, pinCreating, pinDeleting, handlePin } = useAiPin({
    insight,
    thread,
  })
  if (!insight && !thread) return null

  return (
    <IconFrame
      clickable
      type="secondary"
      size={size}
      tooltip={isPinned ? 'Unpin' : 'Pin to dashboard'}
      onClick={() => handlePin()}
      icon={
        pinCreating || pinDeleting ? (
          <Spinner
            css={{
              cursor: 'default',
              '&::before': {
                width: 16,
                height: 16,
                marginTop: -8,
                marginLeft: -8,
              },
            }}
          />
        ) : isPinned ? (
          <PushPinFilledIcon
            color="icon-info"
            css={{ width: 16 }}
          />
        ) : (
          <PushPinOutlineIcon css={{ width: 16 }} />
        )
      }
    />
  )
}
