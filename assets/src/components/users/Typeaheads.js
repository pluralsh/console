import React, { useState } from 'react'
import { TagInput } from 'forge-core'
import { useApolloClient } from 'react-apollo'
import { SEARCH_USERS, SEARCH_GROUPS } from './queries'
import Avatar from './Avatar'
import { Box, Text } from 'grommet'
import moment from 'moment'
import { dateFormat } from '../utils/Graph'

export function fetchUsers(client, query, setSuggestions) {
  if (!query) return

  client.query({
    query: SEARCH_USERS,
    variables: {q: query}
  }).then(({data: {users: {edges}}}) => edges.map(({node}) => ({value: node, label: userSuggestion(node)})))
    .then(setSuggestions)
}

export function fetchGroups(client, query, setSuggestions) {
  if (!query) return

  client.query({
    query: SEARCH_GROUPS,
    variables: {q: query}
  }).then(({data: {groups: {edges}}}) => edges.map(({node}) => ({value: node, label: groupSuggestion(node)})))
    .then(setSuggestions)
}


function userSuggestion(user) {
  return (
    <Box direction='row' align='center' gap='small' pad='xsmall'>
      <Avatar size='30px' user={user} />
      <Box>
        <Text size='small' weight={500}>{user.name}</Text>
        <Text size='small'>{user.email}</Text>
      </Box>
    </Box>
  )
}

function groupSuggestion(group) {
  return (
    <Box direction='row' gap='small' align='center' pad='small'>
      <Text size='small' weight={500}>{group.name}</Text>
      <Text size='small'>-- created {dateFormat(moment(group.insertedAt))}</Text>
    </Box>
  )
}

export function UserTypeahead({users, setUsers, children}) {
  const client = useApolloClient()
  const [suggestions, setSuggestions] = useState([])

  return (
    <TagInput
      placeholder="Search for users by name or email..."
      round='xsmall'
      suggestions={suggestions}
      value={users.map((u) => u.email)}
      onRemove={(email) => setUsers(users.filter((u) => u.email !== email))}
      onAdd={({value}) => setUsers([value, ...users])}
      onChange={({ target: { value } }) => fetchUsers(client, value, setSuggestions)}
      button={children}  />
  )
}

export function GroupTypeahead({groups, setGroups, children}) {
  const client = useApolloClient()
  const [suggestions, setSuggestions] = useState([])

  return (
    <TagInput
      placeholder="Search for groups by handle..."
      round='xsmall'
      suggestions={suggestions}
      value={groups.map((u) => u.name)}
      onRemove={(name) => setGroups(groups.filter((u) => u.name !== name))}
      onAdd={({value}) => setGroups([value, ...groups])}
      onChange={({ target: { value } }) => fetchGroups(client, value, setSuggestions)}
      button={children}  />
  )
}