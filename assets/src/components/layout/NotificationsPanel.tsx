import { Flex, P } from 'honorable'

import { ME_Q, NOTIFICATIONS_Q } from 'components/graphql/users'
import InfiniteScroller from 'components/utils/InfiniteScroller'
import { useApolloClient, useQuery, useSubscription } from '@apollo/client'
import { extendConnection, updateCache } from 'utils/graphql'
import { Dispatch, useEffect } from 'react'

import Notification from './Notification'
import { NOTIFS_SUB } from './queries'

export function NotificationsPanel({ closePanel, all }: {closePanel: Dispatch<void>, all: boolean}) {
  const client = useApolloClient()

  useSubscription(NOTIFS_SUB, {
    onSubscriptionData: () => {
      updateCache(client, {
        query: ME_Q,
        update: ({ me, ...rest }) => ({ ...rest, me: { ...me, unreadNotifications: me.unreadNotifications + 1 } }),
      })
    },
  })

  const {
    data, loading, refetch, fetchMore,
  } = useQuery(NOTIFICATIONS_Q, {
    variables: { all },
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    refetch()
  }, [all, refetch])

  if (!data) return null

  const { edges, pageInfo } = data.notifications

  if (!edges.length) {
    return <P padding="medium">You do not have any notifications yet.</P>
  }

  return (
    <Flex
      flexGrow={1}
      direction="column"
    >
      <InfiniteScroller
        loading={loading}
        hasMore={pageInfo.hasNextPage}
        loadMore={fetchMore}
        loadMoreArgs={{
          variables: { cursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { notifications } }) => extendConnection(prev, notifications, 'notifications'),
        }}
        // Allow for scrolling in a flexbox layout
        flexGrow={1}
        height={0}
      >
        {edges.map(({ node }) => (
          <Notification
            key={node.id}
            notification={node}
            closePanel={closePanel}
          />
        ))}
      </InfiniteScroller>
    </Flex>
  )
}

