import { InMemoryCache } from '@apollo/client'
import {
  DevboxEntityFragment,
  DevboxEntityType,
  DevboxTimelineQuery,
} from 'generated/graphql'
import { DevboxTimelineDocument } from 'generated/graphql-documents'
import { authenticatedCacheConfig } from 'helpers/client'
import { describe, expect, it } from 'vitest'

const entity = (
  type: DevboxEntityType,
  id: string,
  position: number,
  text: string
): DevboxEntityFragment => ({
  __typename: 'DevboxEntity',
  id,
  sessionId: 'session',
  type,
  position,
  revision: 1,
  settled: true,
  createdAt: null,
  updatedAt: null,
  raw: { messageId: id },
  message: {
    __typename: 'DevboxMessageEntity',
    messageId: id,
    promptId: null,
    sentById: null,
    meta: null,
    content: [
      {
        __typename: 'DevboxTextContent',
        type: 'TEXT',
        text,
        annotations: null,
      } as never,
    ],
  },
  sessionMessage: null,
  toolCall: null,
  plan: null,
  terminal: null,
  compaction: null,
})

describe('devbox timeline caching', () => {
  // claude's thinking and the reply it precedes share one api message id
  it('keeps entities that share an id but differ in type apart', () => {
    const cache = new InMemoryCache(authenticatedCacheConfig)
    const variables = { instanceId: 'instance', sessionId: 'session' }
    const entities = [
      entity(DevboxEntityType.AgentThought, 'msg_1', 2, 'thinking'),
      entity(DevboxEntityType.AgentMessage, 'msg_1', 3, 'the reply'),
    ]
    cache.writeQuery<DevboxTimelineQuery>({
      query: DevboxTimelineDocument,
      variables,
      data: {
        devboxTimeline: {
          __typename: 'DevboxTimeline',
          deltaOffset: 0,
          seq: 0,
          stream: 'stream',
          hasMore: false,
          entities,
        },
      },
    })

    const read = cache.readQuery<DevboxTimelineQuery>({
      query: DevboxTimelineDocument,
      variables,
    })
    expect(
      read?.devboxTimeline?.entities?.map((e) => [
        e?.type,
        e?.position,
        e?.message?.content?.[0],
      ])
    ).toEqual(
      entities.map((e) => [e.type, e.position, e.message?.content?.[0]])
    )
  })
})
