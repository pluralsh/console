import React, { useContext, useState } from 'react'
import {
  Anchor,
  Box,
  Layer,
  Text,
} from 'grommet'
import { Logout } from 'forge-core'
import yaml from 'yaml'
import Highlight from 'react-highlight.js'

import { wipeToken } from '../../helpers/auth'

import { LoginContext } from '../contexts'

import Avatar from './Avatar'

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

function sanitize({
  name, repositories, permissions, roleBindings,
}) {
  return {
    name, repositories, permissions, roleBindings: roleBindings.map(sanitizeBinding),
  }
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

export default function EditUser() {
  const { me } = useContext(LoginContext)
  const [editing, setEditing] = useState('User Attributes')

  return (
    <Box
      pad="small"
      background="backgroundColor"
      fill
    >
      {/* eslint-disable-next-line react/jsx-no-constructed-context-values */}
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
            </Box>
            <Box gap="xsmall">
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
        </Box>
      </EditContext.Provider>
    </Box>
  )
}
