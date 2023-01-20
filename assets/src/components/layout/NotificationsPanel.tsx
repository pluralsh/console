import { Flex, P } from 'honorable'

import { ME_Q, NOTIFICATIONS_Q } from 'components/graphql/users'
import InfiniteScroller from 'components/utils/InfiniteScroller'
import { useApolloClient, useQuery, useSubscription } from '@apollo/client'
import { updateCache } from 'utils/graphql'
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
  const hasMoreNotifications = pageInfo?.hasNextPage

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
        hasMore={hasMoreNotifications}
        loadMore={fetchMore}
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

// hasNextPage={pageInfo.hasNextPage}

//       loadNextPage={() => pageInfo.hasNextPage && fetchMore({
//         variables: { cursor: pageInfo.endCursor },
//         updateQuery: (prev, { fetchMoreResult: { notifications } }) => extendConnection(prev, notifications, 'notifications'),
//       })}

  // const [mutation] = useMutation(MARK_READ, {
  //   update: cache => updateCache(cache, {
  //     query: ME_Q,
  //     update: ({ me, ...rest }) => ({ ...rest, me: { ...me, unreadNotifications: 0 } }),
  //   }),
  // })

