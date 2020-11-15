import React, { useState, useContext } from 'react'
import { Box, Text, Layer, TextInput, CheckBox, ThemeContext } from 'grommet'
import { useQuery, useMutation } from 'react-apollo'
import { ModalHeader, Loading, Scroller } from 'forge-core'
import { USERS_Q, GROUPS_Q, EDIT_USER } from './queries'
import Avatar from './Avatar'
import { GroupForm } from './CreateGroup'
import { InviteForm } from './CreateInvite'
import { useParams, useHistory } from 'react-router-dom'
import { User, Group, Add, Search } from 'grommet-icons'
import GroupRow from './Group'

function UserRow({user, next}) {
  const admin = user.roles && user.roles.admin
  const writer = user.roles && user.roles.writer
  const [mutation] = useMutation(EDIT_USER, {variables: {id: user.id}})

  return (
    <Box pad='small' direction='row' align='center' gap='small' border={next ? {side: 'bottom'} : null}>
      <Avatar user={user} size='50px' />
      <Box flex={false}>
        <Text size='small' weight='bold' >{user.email}</Text>
        <Text size='small'>{user.name}</Text>
      </Box>
      <Box fill='horizontal' direction='row' align='center' justify='end'>
        <Box gap='xsmall'>
          <CheckBox
            toggle
            checked={!!admin}
            label='admin'
            onChange={({target: {checked}}) => mutation({variables: {attributes: {roles: {admin: !!checked}}}})} />
          <CheckBox
            toggle
            checked={!!writer}
            label='writer'
            onChange={({target: {checked}}) => mutation({variables: {attributes: {roles: {writer: !!checked}}}})} />
        </Box>
      </Box>
    </Box>
  )
}

function UsersInner() {
  const [q, setQ] = useState(null)
  const {data, fetchMore} = useQuery(USERS_Q, {variables: {q}})

  if (!data) return <Loading />

  const {users: {pageInfo, edges}} = data

  return (
    <Box pad='small' gap='small'>
      <Box direction='row' pad='small' align='center'>
        <Box fill='horizontal'>
          <Text weight={500}>Users</Text>
        </Box>
        <TextInput
          icon={<Search />}
          placeholder='search for users'
          value={q || ''}
          onChange={({target: {value}}) => setQ(value)} />
      </Box>
      <Scroller
        id='users'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}, next) => <UserRow key={node.id} user={node} next={next.node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({variables: {userCursor: pageInfo.endCursor}})}
      />
    </Box>
  )
}


function GroupsInner() {
  const [q, setQ] = useState(null)
  const {data, fetchMore} = useQuery(GROUPS_Q, {variables: {q}})

  if (!data) return <Loading />

  const {groups: {pageInfo, edges}} = data

  return (
    <Box pad='small' gap='small'>
      <Box direction='row' pad='small' align='center'>
        <Box fill='horizontal'>
          <Text weight={500}>Groups</Text>
        </Box>
        <TextInput
          icon={<Search />}
          placeholder='search for groups'
          value={q || ''}
          onChange={({target: {value}}) => setQ(value)} />
      </Box>
      <Scroller
        id='groups'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}, next) => <GroupRow key={node.id} group={node} next={next.node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({variables: {userCursor: pageInfo.endCursor}})}
      />
    </Box>
  )
}

function SectionChoice({label, icon, section, onClick, setSection}) {
  return (
    <Box
      focusIndicator={false}
      hoverIndicator='backgroundDark'
      direction='row'
      align='center'
      gap='small'
      pad='small'
      round='xsmall'
      onClick={onClick || (() => setSection(section))}>
      {icon}
      <Text size='small' weight={500}>{label}</Text>
    </Box>
  )
}

function CreateModal({form, header, children}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {children(() => setOpen(true))}
      {open && (
        <Layer modal position='center' onClickOutside={() => setOpen(false)} onEsc={() => setOpen(false)}>
          <Box width='30vw'>
            <ModalHeader text={header} setOpen={setOpen} />
            <Box pad='small'>
              {form}
            </Box>
          </Box>
        </Layer>
      )}
    </>
  )
}

export default function Directory() {
  const {silo: {background}} = useContext(ThemeContext)
  let {section} = useParams()
  let history = useHistory()
  const setSection = (section) => history.push(`/directory/${section}`)
  section = section || 'users'

  return (
    <Box
      style={background}
      height='100vh'
      pad='medium'
      direction='row'
      gap='medium'
      background='backgroundColor'>
      <Box gap='xsmall' flex={false}>
        <SectionChoice icon={<User size='14px' />} label='Users' section='users' setSection={setSection} />
        <SectionChoice icon={<Group size='14px' />} label='Groups' section='groups' setSection={setSection} />
        <CreateModal header='create a new group' form={<GroupForm />}>
          {(onClick) => <SectionChoice icon={
            <Box direction='row' align='center' gap='xxsmall'>
              <Add size='8px' />
              <Group size='14px' />
            </Box>} label='Create Group' onClick={onClick} />
          }
        </CreateModal>
        <CreateModal header='Invite a user' form={<InviteForm />}>
          {(onClick) => <SectionChoice icon={
            <Box direction='row' align='center' gap='xxsmall'>
              <Add size='8px' />
              <User size='14px' />
            </Box>} label='Invite User' onClick={onClick} />
          }
        </CreateModal>
      </Box>
      <Box background='white' elevation='small' pad='small' fill>
        {section === 'users' && <UsersInner />}
        {section === 'groups' && <GroupsInner />}
      </Box>
    </Box>
  )
}