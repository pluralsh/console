import { ApolloCache } from '@apollo/client'
import {
  AiRole,
  ChatFragment,
  ChatMutation,
  ChatThreadDetailsDocument,
  ChatThreadDetailsQuery,
  ChatType,
  HybridChatMutation,
} from 'generated/graphql'
import { produce } from 'immer'
import { updateCache } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export function getChatOptimisticResponse({
  mutation,
  role,
  content,
  type,
}: {
  mutation: 'hybridChat' | 'chat'
  role?: AiRole
  content?: string
  type?: ChatType
}): HybridChatMutation | ChatMutation {
  const data: ChatFragment = {
    __typename: 'Chat',
    id: crypto.randomUUID(),
    seq: 0,
    content: content ?? '',
    role: role ?? AiRole.User,
    type: type ?? ChatType.Text,
    attributes: null,
    pullRequest: null,
    prAutomation: null,
    confirm: null,
    confirmedAt: null,
    server: null,
    insertedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return mutation === 'hybridChat' ? { hybridChat: [data] } : { chat: data }
}

export function updateChatCache(
  id: string,
  cache: ApolloCache<any>,
  newMessages: Nullable<ChatFragment>[]
) {
  updateCache(cache, {
    query: ChatThreadDetailsDocument,
    variables: { id },
    update: (prev: ChatThreadDetailsQuery) => ({
      chatThread: produce(prev.chatThread, (thread) => {
        thread?.chats?.edges?.unshift?.(
          ...newMessages.filter(isNonNullable).map((chat) => ({
            __typename: 'ChatEdge' as const,
            node: chat,
          }))
        )
      }),
    }),
  })
}
