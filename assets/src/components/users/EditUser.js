import React, { useCallback, useContext, useState } from 'react'
import { Anchor, Box, Layer, Text } from 'grommet'
import { Checkmark, StatusCritical } from 'grommet-icons'
import {
  Button,
  Copyable,
  Credentials,
  EditField,
  InputCollection,
  Logout,
  Password,
  ResponsiveInput,
  Roles,
} from 'forge-core'
import { useMutation } from 'react-apollo'
import yaml from 'yaml'
import Highlight from 'react-highlight.js'

import { fetchToken, wipeToken } from '../../helpers/auth'
import { LoginContext } from '../Login'
import { SectionContentContainer, SectionPortal } from '../utils/Section'
import { SIDEBAR_ICON_HEIGHT } from '../Sidebar'
import { ModalHeader } from '../utils/Modal'
import { localized } from '../../helpers/hostname'

import Avatar from './Avatar'
import { EDIT_USER } from './queries'

const EditContext = React.createContext({})

function EditAvatar({ me }) {
  return (
    <>
      <Avatar
        user={me}
        size="80px"
      />
      {/* <HiddenFileInput accept='.jpg, .jpeg, .png' multiple={false} /> */}
    </>
  )
}

function ActionBox({ onClick, text, icon }) {
  return (
    <Box
      pad="small"
      direction="row"
      round="3px"
      align="center"
      gap="small"
      hoverIndicator="sidebarHover"
      onClick={onClick}
    >
      <Box
        flex={false}
        direction="row"
      >
        {icon}
      </Box>
      <Box fill="horizontal">
        <Text size="small">{text}</Text>
      </Box>
    </Box>
  )
}

function EditSelect({ edit, icon }) {
  const { editing, setEditing } = useContext(EditContext)

  return (
    <Box
      pad="small"
      round="3px"
      fill="horizontal"
      align="center"
      gap="small"
      direction="row"
      hoverIndicator="sidebarHover"
      focusIndicator={false}
      background={edit === editing ? 'sidebarHover' : null}
      height={SIDEBAR_ICON_HEIGHT}
      onClick={edit === editing ? null : () => setEditing(edit)}
    >
      <Box flex={false}>
        {icon}
      </Box>
      <Box fill="horizontal">
        {edit}
      </Box>
    </Box>
  )
}

function EditContent({ edit, children }) {
  const { editing } = useContext(EditContext)
  if (editing !== edit) return null

  return (
    <SectionContentContainer header={edit}>
      <Box
        fill
        pad="small"
      >
        {children}
      </Box>
    </SectionContentContainer>
  )
}

function sanitize({ name, repositories, permissions, roleBindings }) {
  return { name, repositories, permissions, roleBindings: roleBindings.map(sanitizeBinding) }
}

function sanitizeBinding({ user, group }) {
  if (user) return { user: { email: user.email } }
  if (group) return { group: { name: group.name } }
}

function UserRoles({ me }) {
  const [role, setRole] = useState(null)

  return (
    <>
      <Box
        fill
        style={{ overflow: 'auto' }}
        pad="small"
        gap="xsmall"
      >
        {me.boundRoles.map(role => (
          <Box
            key={role.name}
            direction="row"
            gap="xsmall"
          >
            <Anchor
              size="small"
              weight={500}
              onClick={() => setRole(role)}
            >{role.name}
            </Anchor>
            <Text size="small">--</Text>
            <Text size="small"><i>{role.description}</i></Text>
          </Box>
        ))}
      </Box>
      {role && (
        <Layer
          modal
          onClickOutside={() => setRole(null)}
          onEsc={() => setRole(null)}
        >
          <Box width="60vw">
            <Highlight language="yaml">
              {yaml.stringify(sanitize(role))}
            </Highlight>
          </Box>
        </Layer>
      )}
    </>
  )
}

function AllowAccess({ setOpen }) {
  const jwt = fetchToken()
  const url = localized('/access')
  const close = useCallback(() => setOpen(false), [setOpen])

  return (
    <Layer
      modal
      onEsc={close}
      onClickOutside={close}
    >
      <Box width="50vw">
        <ModalHeader
          text="Grant Access"
          setOpen={close}
        />
        <Box
          pad="medium"
          gap="xsmall"
        >
          <Box
            direction="row"
            gap="xsmall"
            align="center"
          >
            <Text size="small">1. Copy the current login token: </Text>
            <Box
              round="xsmall"
              background="tone-light"
              pad="xsmall"
            >
              <Copyable
                text={jwt}
                pillText="Secret copied"
              />
            </Box>
          </Box>
          <Box
            direction="row"
            gap="xsmall"
          >
            <Text size="small">2. Navigate to</Text>
            <Anchor
              href={url}
              target="_blank"
            >{url}
            </Anchor> and paste the
            <Text size="small">jwt above to gain access</Text>
          </Box>
        </Box>
      </Box>
    </Layer>
  )
}

function passwordValid(password, confirm) {
  if (password === '') return { disabled: true, reason: 'please enter a password' }
  if (password !== confirm) return { disabled: true, reason: 'passwords must match' }
  if (password.length < 12) return { disabled: true, reason: 'passwords must be more than 12 characters' }

  return { disabled: false, reason: 'passwords match!' }
}

export default function EditUser() {
  const [open, setOpen] = useState(false)
  const { me } = useContext(LoginContext)
  const [attributes, setAttributes] = useState({ name: me.name, email: me.email })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [editing, setEditing] = useState('User Attributes')
  const mergedAttributes = password && password.length > 0 ? { ...attributes, password } : attributes
  const [mutation, { loading }] = useMutation(EDIT_USER, { variables: { attributes: mergedAttributes } })
  const { disabled, reason } = passwordValid(password, confirm)
  const color = disabled ? 'status-error' : 'status-ok'

  return (
    <Box
      pad="small"
      background="backgroundColor"
      fill
    >
      {open && <AllowAccess setOpen={setOpen} />}
      <EditContext.Provider value={{ editing, setEditing }}>
        <Box
          fill
          direction="row"
          gap="small"
        >
          <Box
            flex={false}
            gap="medium"
            width="250px"
            pad={{ vertical: 'medium' }}
          >
            <Box
              flex={false}
              direction="row"
              gap="small"
              align="center"
            >
              <EditAvatar me={me} />
              <Box>
                <Text>{attributes.name}</Text>
                <Text
                  size="small"
                  color="dark-3"
                >{attributes.email}
                </Text>
              </Box>
            </Box>
            <Box gap="xsmall">
              <EditSelect
                edit="User Attributes"
                icon={<EditField size="small" />}
              />
              <EditSelect
                edit="Password"
                icon={<Password size="small" />}
              />
              <EditSelect
                edit="Bound Roles"
                icon={<Roles size="small" />}
              />
              <ActionBox
                text="Grant Access"
                onClick={() => setOpen(true)}
                icon={<Credentials size="small" />}
              />
              <ActionBox
                text="logout"
                onClick={() => {
                  wipeToken()
                  window.location = '/login'
                }}
                icon={<Logout size="12px" />}
              />
            </Box>
          </Box>
          <Box
            fill
            background="white"
          >
            <EditContent edit="User Attributes">
              <InputCollection>
                <ResponsiveInput
                  value={attributes.name}
                  label="name"
                  onChange={({ target: { value } }) => setAttributes({ ...attributes, name: value })}
                />
                <ResponsiveInput
                  value={attributes.email}
                  label="email"
                  onChange={({ target: { value } }) => setAttributes({ ...attributes, email: value })}
                />
              </InputCollection>
              <SectionPortal>
                <Button
                  loading={loading}
                  onClick={mutation}
                  flex={false}
                  label="Update"
                />
              </SectionPortal>
            </EditContent>
            <EditContent edit="Bound Roles">
              <UserRoles me={me} />
            </EditContent>
            <EditContent edit="Password">
              <InputCollection>
                <ResponsiveInput
                  value={password}
                  label="password"
                  type="password"
                  onChange={({ target: { value } }) => setPassword(value)}
                />
                <ResponsiveInput
                  value={confirm}
                  label="confirm"
                  type="password"
                  onChange={({ target: { value } }) => setConfirm(value)}
                />
              </InputCollection>
              <SectionPortal>
                <Box
                  flex={false}
                  direction="row"
                  justify="end"
                  align="center"
                  gap="small"
                >
                  <Box
                    flex={false}
                    align="center"
                    direction="row"
                    gap="small"
                  >
                    {disabled ? (
                      <StatusCritical
                        size="15px"
                        color={color}
                      />
                    ) : (
                      <Checkmark
                        size="15px"
                        color={color}
                      />
                    )}
                    <Text
                      size="small"
                      color={color}
                    >
                      {reason}
                    </Text>
                  </Box>
                  <Button
                    disabled={disabled}
                    loading={loading}
                    onClick={mutation}
                    label="Update"
                  />
                </Box>
              </SectionPortal>
            </EditContent>
          </Box>
        </Box>
      </EditContext.Provider>
    </Box>
  )
}
