import { useContext, useEffect, useState } from 'react'
import {
  Box,
  Layer,
  Text,
  TextInput,
  ThemeContext,
} from 'grommet'
import { useMutation, useQuery } from 'react-apollo'
import {
  AddGroup,
  AddUser,
  Button,
  CreateRole as CreateRoleI,
  Group,
  InputCollection,
  Messages,
  ModalHeader,
  ResponsiveInput,
  Roles,
  Scroller,
  User,
  Webhooks,
} from 'forge-core'

import { useNavigate, useParams } from 'react-router-dom'

import Toggle from 'react-toggle'

import { BreadcrumbsContext } from '../Breadcrumbs'

import { extendConnection } from '../../utils/graphql'

import { SectionContentContainer, SectionPortal } from '../utils/Section'

import { LoopingLogo } from '../utils/AnimatedLogo'

import { SIDEBAR_ICON_HEIGHT } from '../ConsoleSidebar'

import { WebhookManagement } from '../Webhooks'

import { SMTP_Q, UPDATE_SMTP } from '../graphql/plural'

import { LoginContext } from '../contexts'

import { SearchIcon } from './utils'

import GroupRow from './Group'

import RoleRow, { CreateRole } from './Role'

import {
  EDIT_USER,
  GROUPS_Q,
  ROLES_Q,
  USERS_Q,
} from './queries'

import Avatar from './Avatar'
import { GroupForm } from './CreateGroup'

const INPUT_WIDTH = '350px'

const clean = smtp => {
  const { __typename, ...vals } = smtp || {}

  return vals
}

function SmtpSettingsInner({ smtp }) {
  const [form, setForm] = useState(clean(smtp))
  const [mutation, { loading }] = useMutation(UPDATE_SMTP, {
    variables: { smtp: form },
  })

  return (
    <SectionContentContainer header="SMTP Configuration">
      <Box pad="small">
        <InputCollection>
          <ResponsiveInput
            value={form.server || ''}
            placeholder="smtp.sendrid.net"
            label="server"
            onChange={({ target: { value } }) => setForm({ ...form, server: value })}
          />
          <ResponsiveInput
            value={form.port || ''}
            placeholder="587"
            label="port"
            onChange={({ target: { value } }) => setForm({ ...form, port: parseInt(value) })}
          />
          <ResponsiveInput
            value={form.sender || ''}
            placeholder="from address for outgoing emails"
            label="sender"
            onChange={({ target: { value } }) => setForm({ ...form, sender: value })}
          />
          <ResponsiveInput
            value={form.user || ''}
            placeholder="username for smtp authentication"
            label="user"
            onChange={({ target: { value } }) => setForm({ ...form, user: value })}
          />
          <ResponsiveInput
            value={form.password || ''}
            type="password"
            placeholder="password for smtp authentication"
            label="password"
            onChange={({ target: { value } }) => setForm({ ...form, password: value })}
          />
        </InputCollection>
      </Box>
      <SectionPortal>
        <Button
          loading={loading}
          onClick={mutation}
          flex={false}
          label="Update"
        />
      </SectionPortal>
    </SectionContentContainer>
  )
}

function SmtpSettings() {
  const { data } = useQuery(SMTP_Q)

  console.log(data)

  if (!data) return null

  return <SmtpSettingsInner smtp={data.smtp} />
}

function UserRow({ user }) {
  const admin = user.roles && user.roles.admin
  const [mutation] = useMutation(EDIT_USER, { variables: { id: user.id } })

  return (
    <Box
      pad="small"
      direction="row"
      align="center"
      gap="small"
      border={{ side: 'bottom', color: 'tone-light' }}
    >
      <Avatar
        user={user}
        size="50px"
      />
      <Box flex={false}>
        <Text
          size="small"
          weight="bold"
        >{user.email}
        </Text>
        <Text size="small">{user.name}</Text>
      </Box>
      <Box
        fill="horizontal"
        direction="row"
        align="center"
        justify="end"
      >
        <Box
          flex={false}
          direction="row"
          align="center"
          gap="xsmall"
        >
          <Toggle
            checked={!!admin}
            onChange={({ target: { checked } }) => mutation({ variables: { attributes: { roles: { admin: !!checked } } } })}
          />
          <Text size="small">admin</Text>
        </Box>
      </Box>
    </Box>
  )
}

function UsersInner() {
  const [q, setQ] = useState(null)
  const { data, fetchMore } = useQuery(USERS_Q, { variables: { q } })

  if (!data) return <LoopingLogo scale="0.75" />

  const { users: { pageInfo, edges } } = data

  return (
    <SectionContentContainer header="Users">
      <Scroller
        id="users"
        style={{ height: '100%', overflow: 'auto' }}
        edges={edges}
        mapper={({ node }, next) => (
          <UserRow
            key={node.id}
            user={node}
            next={next.node}
          />
        )}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: { userCursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { users } }) => extendConnection(prev, users, 'users'),
        })}
      />
      <SectionPortal>
        <Box
          flex={false}
          width={INPUT_WIDTH}
        >
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder="search for users"
            value={q || ''}
            onChange={({ target: { value } }) => setQ(value)}
          />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}

function GroupsInner() {
  const [q, setQ] = useState(null)
  const { data, fetchMore } = useQuery(GROUPS_Q, { variables: { q } })

  if (!data) return <LoopingLogo scale="0.75" />

  const { groups: { pageInfo, edges } } = data

  return (
    <SectionContentContainer header="Groups">
      <Scroller
        id="groups"
        style={{ height: '100%', overflow: 'auto' }}
        edges={edges}
        mapper={({ node }, next) => (
          <GroupRow
            key={node.id}
            group={node}
            next={next.node}
          />
        )}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: { userCursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { groups } }) => extendConnection(prev, groups, 'groups'),
        })}
      />
      <SectionPortal>
        <Box
          flex={false}
          width={INPUT_WIDTH}
        >
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder="search for groups"
            value={q || ''}
            onChange={({ target: { value } }) => setQ(value)}
          />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}

function RolesInner() {
  const [q, setQ] = useState(null)
  const { data, fetchMore } = useQuery(ROLES_Q)

  if (!data) return <LoopingLogo scale="0.75" />

  const { roles: { pageInfo, edges } } = data

  return (
    <SectionContentContainer header="Roles">
      <Scroller
        id="roles"
        style={{ height: '100%', overflow: 'auto' }}
        edges={edges}
        mapper={({ node }, next) => (
          <RoleRow
            key={node.id}
            role={node}
            next={next.node}
          />
        )}
        onLoadMore={() => pageInfo.hasNextPage && fetchMore({
          variables: { userCursor: pageInfo.endCursor },
          updateQuery: (prev, { fetchMoreResult: { roles } }) => extendConnection(prev, roles, 'roles'),
        })}
      />
      <SectionPortal>
        <Box
          flex={false}
          width={INPUT_WIDTH}
        >
          <TextInput
            icon={<SearchIcon />}
            reverse
            placeholder="search for roles"
            value={q || ''}
            onChange={({ target: { value } }) => setQ(value)}
          />
        </Box>
      </SectionPortal>
    </SectionContentContainer>
  )
}

function SectionChoice({
  label, icon, section, onClick, setSection,
}) {
  const { section: selected } = useParams()

  return (
    <Box
      focusIndicator={false}
      hoverIndicator="sidebarHover"
      direction="row"
      align="center"
      gap="small"
      pad="small"
      round="3px"
      height={SIDEBAR_ICON_HEIGHT}
      background={section === selected ? 'sidebarHover' : null}
      onClick={onClick || (() => setSection(section))}
    >
      {icon}
      <Text size="small">{label}</Text>
    </Box>
  )
}

function CreateModal({
  form, width, header, children,
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {children(() => setOpen(true))}
      {open && (
        <Layer
          modal
          position="center"
          onClickOutside={() => setOpen(false)}
          onEsc={() => setOpen(false)}
        >
          <Box width={width || '30vw'}>
            <ModalHeader
              text={header}
              setOpen={setOpen}
            />
            <Box pad="small">
              {form}
            </Box>
          </Box>
        </Layer>
      )}
    </>
  )
}

export default function Directory() {
  let { section } = useParams()
  const { me, configuration: conf } = useContext(LoginContext)

  section = section || 'users'
  const navigate = useNavigate()
  const setSection = section => navigate(`/directory/${section}`)
  const { setBreadcrumbs } = useContext(BreadcrumbsContext)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'directory', url: '/directory' },
      { text: section, url: `/directory/${section}` },
    ])
  }, [section])

  return (
    <ThemeContext.Extend value={{ global: { input: { padding: '8px' } } }}>
      <Box
        fill
        direction="row"
        gap="medium"
        background="backgroundColor"
      >
        <Box
          pad="small"
          gap="xsmall"
          flex={false}
          width="200px"
        >
          <SectionChoice
            icon={<User size="14px" />}
            label="Users"
            section="users"
            setSection={setSection}
          />
          <SectionChoice
            icon={<Group size="14px" />}
            label="Groups"
            section="groups"
            setSection={setSection}
          />
          <SectionChoice
            icon={<Roles size="14px" />}
            label="Roles"
            section="roles"
            setSection={setSection}
          />
          {me.roles?.admin && (
            <SectionChoice
              icon={<Messages size="14px" />}
              label="Email Settings"
              section="smtp"
              setSection={setSection}
            />
          )}
          <SectionChoice
            icon={<Webhooks size="14px" />}
            label="Webhooks"
            section="webhooks"
            setSection={setSection}
          />
          <CreateModal
            header="Create a new group"
            form={<GroupForm />}
          >
            {onClick => (
              <SectionChoice
                icon={<AddGroup size="14px" />}
                label="Create Group"
                onClick={onClick}
              />
            )}
          </CreateModal>
          <CreateModal
            width="50vw"
            header="Create a new role"
            form={<CreateRole />}
          >
            {onClick => (
              <SectionChoice
                icon={<CreateRoleI size="14px" />}
                label="Create Role"
                onClick={onClick}
              />
            )}
          </CreateModal>
        </Box>
        <Box
          background="white"
          elevation="small"
          fill
        >
          {section === 'users' && <UsersInner />}
          {section === 'groups' && <GroupsInner />}
          {section === 'roles' && <RolesInner />}
          {section === 'webhooks' && <WebhookManagement />}
          {section === 'smtp' && conf.gitStatus.cloned && <SmtpSettings />}
        </Box>
      </Box>
    </ThemeContext.Extend>
  )
}
