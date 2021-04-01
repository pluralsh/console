import React from 'react'
import { useNotificationSubscription } from '../incidents/Notifications'
import gql from 'graphql-tag'
import { useQuery } from 'react-apollo'

const ME_Q = gql`
  query {
    me {
      id
      name
      email
      avatar
      account { id name }
      publisher { id  name }
    }
  }
`

// const POLL_INTERVAL=30000
export const CurrentUserContext = React.createContext({})

export default function CurrentUser({children}) {
  const {loading, error, data} = useQuery(ME_Q)
  useNotificationSubscription()

  if (loading) return null

  if (error || !data || !data.me || !data.me.id) {
    return null
  }
  return (
    <CurrentUserContext.Provider value={data.me}>
      {children}
    </CurrentUserContext.Provider>
  )
}
