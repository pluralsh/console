import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Box, Text } from 'grommet'
import { Button, GqlError, SecondaryButton } from 'forge-core'
import { Checkmark, StatusCritical } from 'grommet-icons'

import { Form } from 'honorable'

import { setToken } from '../../helpers/auth'

import { initials } from '../utils/Avatar'
import { INVITE_Q, SIGNUP } from '../graphql/users'

import { LabelledInput } from '../utils/LabelledInput'

import { LoginPortal } from './LoginPortal'

function InvalidInvite() {
  return (
    <Box
      width="100vw"
      height="100vh"
      justify="center"
      align="center"
    >
      <Box>
        <Text>That invite code is no longer valid</Text>
      </Box>
    </Box>
  )
}

export function disableState(password, confirm) {
  if (password.length === 0) return { disabled: true, reason: 'enter a password' }
  if (password.length < 10) return { disabled: true, reason: 'password is too short' }
  if (password !== confirm) return { disabled: true, reason: 'passwords do not match' }

  return { disabled: false, reason: 'passwords match!' }
}

function DummyAvatar({ name, size: given }:{name:any, size?:any}) {
  const size = given || '50px'

  return (
    <Box
      flex={false}
      round="xsmall"
      align="center"
      justify="center"
      width={size}
      height={size}
      background="#6b5b95"
    >
      <Text size="small">{initials(name)}</Text>
    </Box>
  )
}

export function PasswordStatus({ disabled, reason }) {
  return (
    <Box
      direction="row"
      fill="horizontal"
      align="center"
      gap="xsmall"
    >
      {disabled ? (
        <StatusCritical
          color="error"
          size="12px"
        />
      ) : (
        <Checkmark
          color="status-ok"
          size="12px"
        />
      )}
      <Text
        size="small"
        color={disabled ? 'error' : 'status-ok'}
      >{reason}
      </Text>
    </Box>
  )
}

export default function Invite() {
  const { inviteId } = useParams()
  const [attributes, setAttributes] = useState({ name: '', password: '' })
  const [confirm, setConfirm] = useState('')
  const [editPassword, setEditPassword] = useState(false)
  const [mutation, { loading, error: signupError }] = useMutation(SIGNUP, {
    variables: { inviteId, attributes },
    onCompleted: ({ signup: { jwt } }) => {
      setToken(jwt)
      window.location = '/' as any as Location
    },
    onError: console.log,
  })
  const { data, error } = useQuery(INVITE_Q, { variables: { id: inviteId } })

  if (error) return <InvalidInvite />
  if (!data) return null

  const { disabled, reason } = disableState(attributes.password, confirm)
  const { email } = data.invite
  const filled = attributes.name.length > 0
  const onSubmit = e => {
    e.preventDefault()
    if (!(editPassword && filled)) {
      return
    }
    mutation()
  }

  return (
    <LoginPortal>
      <Form onSubmit={onSubmit}>
        <Box gap="small">
          {signupError && (
            <GqlError
              header="Signup failed"
              error={signupError}
            />
          )}
          <Box
            justify="center"
            align="center"
          >
            <Text size="large">Accept your invite</Text>
          </Box>
          <Box
            direction="row"
            gap="small"
            align="center"
          >
            <DummyAvatar name={attributes.name} />
            <Box>
              <Text
                size="small"
                weight={500}
              >{attributes.name}
              </Text>
              <Text
                size="small"
                color="dark-3"
              >{email}
              </Text>
            </Box>
          </Box>
          {editPassword ? (
            <Box
              animation={{ type: 'fadeIn', duration: 500 }}
              gap="small"
            >
              <LabelledInput
                type="password"
                label="Password"
                width="400px"
                value={attributes.password}
                placeholder="battery horse fire stapler"
                onChange={password => setAttributes({ ...attributes, password })}
              />
              <LabelledInput
                type="password"
                label="Confirm"
                width="400px"
                value={confirm}
                placeholder="type it again"
                onChange={setConfirm}
              />
            </Box>
          ) : (
            <Box
              animation={{ type: 'fadeIn', duration: 500 }}
              gap="small"
            >
              <LabelledInput
                label="Email"
                value={email}
              />
              <LabelledInput
                label="Name"
                value={attributes.name}
                placeholder="John Doe"
                onChange={name => setAttributes({ ...attributes, name })}
              />
            </Box>
          )}
          <Box
            direction="row"
            justify="end"
            align="center"
          >
            {editPassword && (
              <PasswordStatus
                disabled={disabled}
                reason={reason}
              />
            )}
            <Box
              flex={false}
              direction="row"
              gap="small"
            >
              {editPassword && (
                <SecondaryButton
                  label="Go Back"
                  onClick={() => setEditPassword(false)}
                />
              )}
              <Button
                loading={loading}
                disabled={editPassword ? disabled : !filled}
                label={editPassword ? 'Sign up' : 'continue'}
                onClick={editPassword ? mutation : () => setEditPassword(true)}
              />
            </Box>
          </Box>
        </Box>
      </Form>
    </LoginPortal>
  )
}
