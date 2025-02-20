import {
  Button,
  ContentCard,
  Flex,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useContext, useState } from 'react'
import { UPDATE_USER } from 'components/graphql/users'
import { useMutation } from '@apollo/client'
import { LoginContext } from 'components/contexts'
import { useTheme } from 'styled-components'

const validPassword = (pass) =>
  pass.length < 8
    ? { error: true, message: 'password is too short' }
    : { error: false, message: 'valid password!' }

function UpdatePassword({ cancel }: any) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [second, setSecond] = useState('')
  const [mutation, { loading }] = useMutation(UPDATE_USER, {
    variables: { attributes: { password } },
  })

  return (
    <Flex
      flexDirection="column"
      gap="small"
    >
      <ValidatedInput
        width="100%"
        label="Current password"
        placeholder="Enter your current password"
        type="password"
        value={confirm}
        onChange={({ target: { value } }) => setConfirm(value)}
      />
      <ValidatedInput
        width="100%"
        label="New password"
        placeholder="Enter new password"
        type="password"
        value={password}
        onChange={({ target: { value } }) => setPassword(value)}
        validation={(pass) => (!pass ? null : validPassword(pass))}
      />
      <ValidatedInput
        width="100%"
        label="Confirm new password"
        placeholder="Enter new password again"
        type="password"
        value={second}
        onChange={({ target: { value } }) => setSecond(value)}
        validation={(pass) =>
          !pass
            ? null
            : pass !== password
              ? { error: true, message: 'passwords do not match' }
              : { error: false, message: 'passwords match!' }
        }
      />
      <Flex
        alignItems="center"
        justifyContent="flex-end"
        gap="small"
      >
        <Button
          secondary
          small
          onClick={cancel}
        >
          Cancel
        </Button>
        <Button
          small
          loading={loading}
          disabled={password.length < 8 || password !== second}
          onClick={() => mutation()}
        >
          Update password
        </Button>
      </Flex>
    </Flex>
  )
}

export default function SecurityPassword() {
  const theme = useTheme()
  const { configuration } = useContext<any>(LoginContext)
  const [pass, setPass] = useState(false)

  if (configuration?.pluralLogin) return null

  return (
    <ContentCard overflowY="auto">
      <Flex
        flexDirection="column"
        gap="large"
      >
        <div
          css={{
            ...theme.partials.text.body1,
            fontWeight: 600,
          }}
        >
          Password
        </div>
        <div>
          {!pass && (
            <Button
              alignSelf="start"
              secondary
              onClick={() => setPass(true)}
            >
              Change password
            </Button>
          )}
          {pass && <UpdatePassword cancel={() => setPass(false)} />}
        </div>
      </Flex>
    </ContentCard>
  )
}
