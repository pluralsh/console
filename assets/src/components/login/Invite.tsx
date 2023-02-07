import { ComponentProps, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import {
  Div,
  Flex,
  Form,
  P,
} from 'honorable'
import { Button } from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'

import { WelcomeHeader } from 'components/utils/WelcomeHeader'

import { setToken } from '../../helpers/auth'

import { LabelledInput } from '../utils/LabelledInput'
import { INVITE_Q, SIGNUP } from '../graphql/users'

import { LoginPortal } from './LoginPortal'
import {
  PasswordError,
  PasswordErrorCode,
  PasswordErrorMessage,
  validatePassword,
} from './PasswordValidation'

function InvalidInvite() {
  return (
    <Flex
      width="100vw"
      height="100vh"
      justifyContent="center"
      alignItems="center"
    >
      This invite code is no longer valid
    </Flex>
  )
}

function PasswordErrorMsg({ errorCode }: { errorCode: PasswordErrorCode }) {
  return (
    <P
      caption
      color="text-error"
    >
      {PasswordErrorMessage[errorCode]}
    </P>
  )
}

export function SetPasswordField({
  errorCode,
  ...props
}: { errorCode?: PasswordErrorCode } & Omit<
  ComponentProps<typeof LabelledInput>,
  'errorCode'
>) {
  return (
    <LabelledInput
      required
      label="Password"
      type="password"
      placeholder="Enter password"
      hint="10 character minimum"
      caption={
        errorCode === PasswordError.TooShort && (
          <PasswordErrorMsg errorCode={errorCode} />
        )
      }
      error={errorCode === PasswordError.TooShort}
      {...props}
    />
  )
}

export function ConfirmPasswordField({
  errorCode,
  ...props
}: ComponentProps<typeof SetPasswordField>) {
  return (
    <LabelledInput
      required
      label="Confirm password"
      type="password"
      placeholder="Confirm password"
      hint=""
      caption={
        errorCode === PasswordError.NoMatch && (
          <PasswordErrorMsg errorCode={errorCode} />
        )
      }
      error={errorCode === PasswordError.NoMatch}
      {...props}
    />
  )
}

export default function Invite() {
  const { inviteId } = useParams()
  const [attributes, setAttributes] = useState({ name: '', password: '' })
  const [confirm, setConfirm] = useState('')
  const [mutation, { loading, error: signupError }] = useMutation(SIGNUP, {
    variables: { inviteId, attributes },
    onCompleted: ({ signup: { jwt } }) => {
      setToken(jwt)
      window.location = '/' as any as Location
    },
    onError: console.log,
  })
  const { data, error } = useQuery(INVITE_Q, { variables: { id: inviteId } })

  if (error || (data && !data.invite)) return <InvalidInvite />
  if (!data) return null

  const email = data?.invite?.email

  const { disabled: passwordDisabled, error: passwordError } = validatePassword(attributes.password,
    confirm)

  const isNameValid = attributes.name.length > 0
  const submitEnabled = isNameValid && !passwordDisabled && email

  const onSubmit = e => {
    e.preventDefault()
    if (!submitEnabled) {
      return
    }
    mutation()
  }

  return (
    <LoginPortal>
      <Div marginBottom="xlarge">
        <WelcomeHeader textAlign="left" />
        <P
          body1
          color="text-xlight"
        >
          You have been invited to join this Plural account. Create an account
          to join.
        </P>
      </Div>
      <Form
        onSubmit={onSubmit}
      >
        {signupError && (
          <Div marginBottom="large">
            <GqlError
              header="Signup failed"
              error={signupError}
            />
          </Div>
        )}
        <Flex
          flexDirection="column"
          gap="small"
          marginBottom="small"
        >
          <LabelledInput
            label="Email"
            value={email}
            disabled
          />
          <LabelledInput
            label="Username"
            value={attributes.name}
            placeholder="Enter username"
            onChange={name => setAttributes({ ...attributes, name })}
            required
          />

          <SetPasswordField
            value={attributes.password}
            onChange={password => setAttributes({ ...attributes, password })}
            errorCode={passwordError}
          />
          <ConfirmPasswordField
            value={confirm}
            onChange={setConfirm}
            errorCode={passwordError}
          />
        </Flex>
        <Button
          type="submit"
          primary
          width="100%"
          loading={loading}
          disabled={!submitEnabled}
        >
          Sign up
        </Button>
      </Form>
    </LoginPortal>
  )
}
