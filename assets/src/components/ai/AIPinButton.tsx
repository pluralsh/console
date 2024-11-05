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

interface AIPinButtonProps {
  insight?: Nullable<AiInsightFragment>
  thread?: Nullable<ChatThreadTinyFragment>
}

export default function AIPinButton({ insight, thread }: AIPinButtonProps) {
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

  if (!insight && !thread) {
    return null
  }

  const handleClick = () => {
    if (pinCreating || pinDeleting) return
    if (isPinned) deletePin({ variables: { id: pin?.aiPin?.id ?? '' } })
    else createPin()
  }

  return (
    <IconFrame
      clickable
      type="secondary"
      size="large"
      tooltip={isPinned ? 'Unpin' : 'Pin to dashboard'}
      onClick={handleClick}
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
