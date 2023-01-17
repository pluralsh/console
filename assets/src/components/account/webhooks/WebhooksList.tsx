import { LoopingLogo } from '@pluralsh/design-system'

import { extendConnection } from 'utils/graphql'

import SmoothScroller from 'components/utils/SmoothScroller'

import { useQuery } from '@apollo/client'

import { useState } from 'react'

import { WEBHOOKS_Q } from 'components/graphql/webhooks'

import { Flex } from 'honorable'

import { WebhookRow } from './WebhooksOld'

export function WebhooksList() {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useQuery(WEBHOOKS_Q)

  if (!data) return <LoopingLogo />
  const { edges, pageInfo } = data.webhooks

  return (
    <Flex
      direction="column"
      grow={1}
    >
      <SmoothScroller
        listRef={listRef}
        setListRef={setListRef}
        items={edges}
        mapper={({ node }) => <WebhookRow hook={node} />}
        loading={loading}
        loadNextPage={() => pageInfo.hasNextPage && fetchMore({
          variables: { cursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { webhooks } }) => extendConnection(prev, webhooks, 'webhooks'),
        })}
        hasNextPage={pageInfo.hasNextPage}
        placeholder={undefined}
        handleScroll={undefined}
        refreshKey={undefined}
        setLoader={undefined}
      />
    </Flex>

  )
}
