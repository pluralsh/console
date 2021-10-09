import React, { useState, useContext, useEffect } from 'react'
import { Box, Text, Layer, TextInput, CheckBox, ThemeContext } from 'grommet'
import { useQuery, useMutation } from 'react-apollo'
import { ModalHeader, Scroller } from 'forge-core'
import { USERS_Q, GROUPS_Q, EDIT_USER, ROLES_Q } from './queries'
import Avatar from './Avatar'
import { GroupForm } from './CreateGroup'
import { InviteForm } from './CreateInvite'
import { useParams, useHistory } from 'react-router-dom'
import { User, Group, Add, Script } from 'grommet-icons'
import GroupRow from './Group'
import { BreadcrumbsContext } from '../Breadcrumbs'
import RoleRow, { CreateRole } from './Role'
import { extendConnection } from '../../utils/graphql'
import { SearchIcon } from './utils'
import { SectionContentContainer, SectionPortal } from '../utils/Section'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { SIDEBAR_ICON_HEIGHT } from '../Sidebar'

const INPUT_WIDTH = '350px'

function UserRow({user}) {
  const admin = user.roles && user.roles.admin
  const [mutation] = useMutation(EDIT_USER, {variables: {id: user.id}})

  return (
    <Box pad='small' direction='row' align='center' gap='small' 
         border={{side: 'bottom', color: 'tone-light'}}>
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
        </Box>
      </Box>
    </Box>
  )
}

function UsersInner() {
  const [q, setQ] = useState(null)
  const {data, fetchMore} = useQuery(USERS_Q, {variables: {q}})

  if (!data) return <LoopingLogo scale='0.75' />

  const {users: {pageInfo, edges}} = data

  return (
    <SectionContentContainer header='Users'>
      <Scroller
        id='users'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}, next) => <UserRow key={node.id} user={node} next={next.node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: {userCursor: pageInfo.endCursor},
          updateQuery: (prev, {fetchMoreResult: {users}}) => extendConnection(prev, users, 'users')
        })}
      />
      <SectionPortal>
        <Box flex={false} width={INPUT_WIDTH}>
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder='search for users'
            value={q || ''}
            onChange={({target: {value}}) => setQ(value)} />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}


function GroupsInner() {
  const [q, setQ] = useState(null)
  const {data, fetchMore} = useQuery(GROUPS_Q, {variables: {q}})

  if (!data) return <LoopingLogo scale='0.75' />

  const {groups: {pageInfo, edges}} = data

  return (
    <SectionContentContainer header='Groups'>
      <Scroller
        id='groups'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}, next) => <GroupRow key={node.id} group={node} next={next.node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: {userCursor: pageInfo.endCursor},
          updateQuery: (prev, {fetchMoreResult: {groups}}) => extendConnection(prev, groups, 'groups')
        })}
      />
      <SectionPortal>
        <Box flex={false} width={INPUT_WIDTH}>
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder='search for groups'
            value={q || ''}
            onChange={({target: {value}}) => setQ(value)} />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}

function RolesInner() {
  const [q, setQ] = useState(null)
  const {data, fetchMore} = useQuery(ROLES_Q)

  if (!data) return <LoopingLogo scale='0.75' />

  const {roles: {pageInfo, edges}} = data

  return (
    <SectionContentContainer header='Roles'>
      <Scroller
        id='roles'
        style={{height: '100%', overflow: 'auto'}}
        edges={edges}
        mapper={({node}, next) => <RoleRow key={node.id} role={node} next={next.node} />}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: {userCursor: pageInfo.endCursor},
          updateQuery: (prev, {fetchMoreResult: {roles}}) => extendConnection(prev, roles, 'roles')
        })}
      />
      <SectionPortal>
        <Box flex={false} width={INPUT_WIDTH}>
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder='search for roles'
            value={q || ''}
            onChange={({target: {value}}) => setQ(value)} />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}

function SectionChoice({label, icon, section, onClick, setSection}) {
  const {section: selected} = useParams()
  return (
    <Box
      focusIndicator={false} hoverIndicator='sidebarHover'
      direction='row' align='center' gap='small' pad='small'
      round='xsmall' height={SIDEBAR_ICON_HEIGHT}
      background={section === selected ? 'sidebarHover' : null}
      onClick={onClick || (() => setSection(section))}>
      {icon}
      <Text size='small'>{label}</Text>
    </Box>
  )
}

function CreateModal({form, width, header, children}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {children(() => setOpen(true))}
      {open && (
        <Layer modal position='center' onClickOutside={() => setOpen(false)} onEsc={() => setOpen(false)}>
          <Box width={width || '30vw'}>
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
  let {section} = useParams()
  section = section || 'users'
  let history = useHistory()
  const setSection = (section) => history.push(`/directory/${section}`)
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => setBreadcrumbs([
    {text: 'directory', url: '/directory'},
    {text: section, url: `/directory/${section}`}
  ]), [section])

  return (
    <ThemeContext.Extend value={{global: {input: {padding: '8px'}}}}>
    <Box fill direction='row' gap='medium' background='backgroundColor'>
      <Box pad='small' gap='xsmall' flex={false} width='200px'>
        <SectionChoice 
          icon={<User size='14px' />} 
          label='Users' 
          section='users' 
          setSection={setSection} />
        <SectionChoice 
          icon={<Group size='14px' />} 
          label='Groups' 
          section='groups' 
          setSection={setSection} />
        <SectionChoice 
          icon={<Script size='14px' />} 
          label='Roles' 
          section='roles' 
          setSection={setSection} />
        <CreateModal header='Create a new group' form={<GroupForm />}>
          {(onClick) => <SectionChoice icon={
            <Box direction='row' align='center' gap='xxsmall'>
              <Add size='8px' />
              <Group size='14px' />
            </Box>} label='Create Group' onClick={onClick} />
          }
        </CreateModal>
        <CreateModal width='50vw' header='Create a new role' form={<CreateRole />}>
          {(onClick) => <SectionChoice icon={
            <Box direction='row' align='center' gap='xxsmall'>
              <Add size='8px' />
              <Script size='14px' />
            </Box>} label='Create Role' onClick={onClick} />
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
      <Box background='white' elevation='small' fill>
        {section === 'users' && <UsersInner />}
        {section === 'groups' && <GroupsInner />}
        {section === 'roles' && <RolesInner />}
      </Box>
    </Box>
    </ThemeContext.Extend>
  )
}