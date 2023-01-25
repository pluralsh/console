import { Card, LoopingLogo } from '@pluralsh/design-system'

import { extendConnection } from 'utils/graphql'

import SmoothScroller from 'components/utils/SmoothScroller'

import { useQuery } from '@apollo/client'

import { useState } from 'react'

import { WEBHOOKS_Q } from 'components/graphql/webhooks'

import Webhook from './Webhook'

export default function WebhooksList() {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useQuery(WEBHOOKS_Q)

  if (!data) return <LoopingLogo />
  const { edges, pageInfo } = data.webhooks

  if (edges?.length < 1) return null

  return (
    <Card
      marginTop="medium"
      alignItems="top"
      display="flex"
      flexDirection="column"
      flexGrow={1}
    >
      <SmoothScroller
        listRef={listRef}
        setListRef={setListRef}
        items={edges}
        mapper={({ node }) => <Webhook hook={node} />}
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
    </Card>
  )
}
