import {
  Button,
  FormField,
  GitHubLogoIcon,
  Input,
  Switch,
} from '@pluralsh/design-system'
import {
  AuthMethod,
  GitAttributes,
  useCreateGitRepositoryMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt, { StepH } from '../ModalAlt'
import { PrepareGitStep } from '../PrepareGitStep'

export function ImportGit({ refetch }: { refetch: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <>
      <Button
        primary
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Import Git
      </Button>
      <ModalMountTransition open={isOpen}>
        <ImportGitModal
          open={isOpen}
          onClose={closeModal}
          refetch={refetch}
        />
      </ModalMountTransition>
    </>
  )
}

export const getAuthMethodFromGitUrl = (gitUrl: string | null | undefined) =>
  gitUrl?.match(/^https/) ? AuthMethod.Basic : AuthMethod.Ssh

export function ImportGitModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const [gitUrl, setGitUrl] = useState('')
  const [requireAuth, setRequireAuth] = useState(false)
  const authMethod = getAuthMethodFromGitUrl(gitUrl)
  const [privateKey, setPrivateKey] = useState<GitAttributes['privateKey']>('')
  const [passphrase, setPassphrase] = useState<GitAttributes['passphrase']>('')
  const [username, setUsername] = useState<GitAttributes['username']>('')
  const [password, setPassword] = useState<GitAttributes['password']>('')

  const [mutation, { loading, error }] = useCreateGitRepositoryMutation({
    variables: {
      attributes: {
        url: gitUrl,
        ...(requireAuth
          ? authMethod === AuthMethod.Ssh
            ? { privateKey, passphrase }
            : { username, password }
          : {}),
      },
    },
    onCompleted: () => {
      refetch?.()
      onClose()
    },
  })

  const disabled =
    !gitUrl ||
    (requireAuth
      ? authMethod === AuthMethod.Ssh
        ? !privateKey
        : !username || !password
      : false)
  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )

  useEffect(() => {}, [gitUrl])

  const initialFocusRef = useRef<HTMLInputElement>()

  useEffect(() => {
    if (open) {
      initialFocusRef.current?.focus?.()
    }
  }, [open])

  return (
    <ModalAlt
      header="Import Git"
      open={open}
      portal
      onClose={onClose}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={disabled}
            loading={loading}
            primary
          >
            Import
          </Button>
          <Button
            type="button"
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <>
        <PrepareGitStep />
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <StepH>Step 2. Connect your repository</StepH>
          <Input
            inputProps={{ ref: initialFocusRef }}
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            placeholder="https://host.com/your-repo.git"
            titleContent={<GitHubLogoIcon />}
          />

          <Switch
            checked={requireAuth}
            onChange={(val) => setRequireAuth(val)}
          >
            Requires authorization
          </Switch>
        </div>
        {requireAuth && (
          <div
            css={{
              display: 'flex',
              columnGap: theme.spacing.small,
              '> *': {
                flexGrow: 1,
              },
            }}
          >
            {authMethod === AuthMethod.Ssh ? (
              <>
                <FormField
                  label="Private key"
                  required
                >
                  <Input
                    inputProps={{ type: 'password' }}
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.currentTarget.value)
                    }}
                    placeholder="Private key"
                  />
                </FormField>
                <FormField
                  label="Passphrase"
                  required
                >
                  <Input
                    inputProps={{ type: 'password' }}
                    value={passphrase}
                    onChange={(e) => {
                      setPassphrase(e.currentTarget.value)
                    }}
                    placeholder="Passphrase"
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField
                  label="User name"
                  required
                >
                  <Input
                    value={username}
                    onChange={(e) => {
                      setUsername(e.currentTarget.value)
                    }}
                    placeholder="User name"
                  />
                </FormField>
                <FormField
                  label="Password"
                  required
                >
                  <Input
                    inputProps={{ type: 'password' }}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.currentTarget.value)
                    }}
                    placeholder="Password"
                  />
                </FormField>
              </>
            )}
          </div>
        )}
        {error && (
          <GqlError
            header="Problem importing repository"
            error={error}
          />
        )}
      </>
    </ModalAlt>
  )
}
