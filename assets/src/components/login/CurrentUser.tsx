import gql from 'graphql-tag'
import { useQuery } from '@apollo/client'
import { createContext } from 'react'

const ME_Q = gql`
  query {
    me {
      id
      name
      email
      avatar
      account {
        id
        name
      }
      publisher {
        id
        name
      }
    }
  }
`

// const POLL_INTERVAL=30000
export const CurrentUserContext = createContext({})

export default function CurrentUser({ children }) {
  const { loading, error, data } = useQuery(ME_Q)

  if (loading) return null

  if (error || !data || !data.me || !data.me.id) {
    return children
  }

  return (
    <CurrentUserContext.Provider value={data.me}>
      {children}
    </CurrentUserContext.Provider>
  )
}
