import React, { useCallback, useContext, useMemo, useState } from 'react'
import { Notification } from 'forge-core'
import { Box, Stack, Text } from 'grommet'
import { FlyoutContainer } from '../Console'
import { useApolloClient, useMutation, useQuery, useSubscription } from '@apollo/react-hooks'
import { ME_Q, NOTIFICATIONS_Q } from '../graphql/users'
import { StandardScroller } from '../utils/SmoothScroller'
import { extendConnection, updateCache } from '../../utils/graphql'
import { ApplicationIcon, InstallationContext } from '../Installations'
import { SeverityNub } from '../runbooks/StatusIcon'
import { MARK_READ, NOTIFS_SUB } from './queries'
import { LoginContext } from '../Login'

const SIZE = '35px'

function NotificationRow({notif}) {
  const {applications, setCurrentApplication} = useContext(InstallationContext)
  const app = useMemo(() => applications.find(({name}) => name === notif.repository), [applications, notif])
  const setCurrent = useCallback(() => {
   if (app) setCurrentApplication(app) 
  }, [app, setCurrentApplication])

  return (
    <Box flex={false} pad='small' gap='small' border='bottom'
         hoverIndicator='card' direction='row' align='center' 
         onClick={setCurrent}>
      <SeverityNub sev={notif.severity.toLowerCase()} />
      <Box fill='horizontal'>
        <Text size='small' weight={500}>{notif.title}</Text>
        <Text size='small' color='dark-3'>{notif.description}</Text>
      </Box>
      <ApplicationIcon application={app} />
    </Box>
  )
}

function Placeholder() {
  return (
    <Box flex={false} height='50px' pad='small' gap='xsmall'>
      <Box width='40%' color='card' height='20px' />
      <Box width='70%' color='card' height='20px' />
    </Box>
  )
}

function NotificationList() {
  const [listRef, setListRef] = useState(null)
  const {data, loading, fetchMore} = useQuery(NOTIFICATIONS_Q, {
    fetchPolicy: 'cache-and-network'
  })

  if (!data) return null

  const {edges, pageInfo} = data.notifications

  return (
    <StandardScroller
      listRef={listRef}
      setListRef={setListRef}
      items={edges}
      loading={loading}
      placeholder={Placeholder}
      hasNextPage={pageInfo.hasNextPage}
      mapper={({node}) => <NotificationRow key={node.id} notif={node} />}
      loadNextPage={() => pageInfo.hasNextPage && fetchMore({
        variables: {cursor: pageInfo.endCursor},
        updateQuery: (prev, {fetchMoreResult: {notifications}}) => extendConnection(prev, notifications, 'notifications')
      })} />
  )
}

export function Notifications() {
  const client = useApolloClient()
  const [open, setOpen] = useState(false)
  const {me} = useContext(LoginContext) 
  const [mutation] = useMutation(MARK_READ, {
    update: (cache) => updateCache(cache, {
      query: ME_Q,
      update: ({me, ...rest}) => ({...rest, me: {...me, unreadNotifications: 0}})
    })
  })
  const doClose = useCallback(() => {
    mutation()
    setOpen(false)
  }, [mutation, setOpen])

  useSubscription(NOTIFS_SUB, {
    onSubscriptionData: () => {
      updateCache(client, {
        query: ME_Q,
        update: ({me, ...rest}) => ({...rest, me: {...me, unreadNotifications: me.unreadNotifications + 1}})
      })
    }
  })

  const notifsLabel = me.unreadNotifications > 100 ? '!!' : me.unreadNotifications

  return (
    <>
    <Stack anchor='top-right'>
      <Box flex={false} width={SIZE} height={SIZE} round='full' 
           background='backgroundColor' align='center' justify='center'
          hoverIndicator='sidebarHover' onClick={() => setOpen(true)}>
        <Notification size='18px' />
      </Box>
      {me.unreadNotifications > 0 && (
        <Box flex={false} width='14px' height='14px' background='error' round='full'
             align='center' justify='center' margin={{top: '-5px'}}>
          <Text size='10px'>{notifsLabel}</Text>
        </Box>
      )}
    </Stack>
    {open && (
      <FlyoutContainer width='500px' header='Notifications' close={doClose}>
        <NotificationList />
      </FlyoutContainer>
    )}
    </>
  )
}