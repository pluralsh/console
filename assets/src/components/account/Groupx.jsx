import React, { useRef, useState } from 'react'
import { Box, Text, TextInput } from 'grommet'
import { useApolloClient, useMutation } from '@apollo/client'

import { TooltipContent } from 'forge-core'

import { SearchIcon, addGroupMember } from './utils'

import { fetchUsers } from './Typeaheads'
import { CREATE_GROUP_MEMBERS } from './queries'

export function Icon({
  icon, iconAttrs, tooltip, onClick, hover,
}) {
  const dropRef = useRef()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Box
        ref={dropRef}
        pad="small"
        round="xsmall"
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        hoverIndicator={hover || 'light-2'}
        focusIndicator={false}
      >
        {React.createElement(icon, { size: '14px', ...(iconAttrs || {}) })}
      </Box>
      {open && (
        <TooltipContent
          pad="xsmall"
          round="xsmall"
          justify="center"
          targetRef={dropRef}
          margin={{ bottom: 'xsmall' }}
          side="top"
          align={{ bottom: 'top' }}
        >
          <Text
            size="small"
            weight={500}
          >{tooltip}
          </Text>
        </TooltipContent>
      )}
    </>
  )
}

function MemberAdd({ group, setModal }) {
  const client = useApolloClient()
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [mutation] = useMutation(CREATE_GROUP_MEMBERS, {
    variables: { groupId: group.id },
    update: (cache, { data: { createGroupMember } }) => {
      try {
        addGroupMember(cache, group, createGroupMember)
      }
      catch {
        // igonre
      }
    },
    onCompleted: () => setModal(null),
  })

  return (
    <Box
      gap="small"
      pad="medium"
    >
      <TextInput
        icon={<SearchIcon />}
        placeholder="search for a user"
        value={q}
        suggestions={suggestions}
        onSelect={({ suggestion: { value } }) => {
          setQ(value.name)
          mutation({ variables: { userId: value.id } })
        }}
        onChange={({ target: { value } }) => {
          setQ(value)
          fetchUsers(client, value, setSuggestions)
        }}
      />
    </Box>
  )
}

