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
  GitRepositoriesRowFragment,
  useUpdateGitRepositoryMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { GqlError } from 'components/utils/Alert'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt from '../ModalAlt'

import { getAuthMethodFromGitUrl } from './GitRepositoriesImportGit'

export function UpdateGitRepository({
  repo,
  refetch,
}: {
  repo: GitRepositoriesRowFragment
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <>
      <Button
        secondary
        small
        onClick={() => {
          setIsOpen(true)
        }}
      >
        Update
      </Button>
      <ModalMountTransition open={isOpen}>
        <ModalForm
          open={isOpen}
          repo={repo}
          refetch={refetch}
          onClose={closeModal}
        />
      </ModalMountTransition>
    </>
  )
}

export function ModalForm({
  open,
  repo,
  onClose,
  refetch,
}: {
  open: boolean
  repo: GitRepositoriesRowFragment
  onClose: () => void
  refetch: () => void
}) {
  const theme = useTheme()
  const [gitUrl, setGitUrl] = useState(repo.url)
  const [requireAuth, setRequireAuth] = useState(false)
  const authMethod = getAuthMethodFromGitUrl(gitUrl)
  const [privateKey, setPrivateKey] = useState<GitAttributes['privateKey']>('')
  const [passphrase, setPassphrase] = useState<GitAttributes['passphrase']>('')
  const [username, setUsername] = useState<GitAttributes['username']>('')
  const [password, setPassword] = useState<GitAttributes['password']>('')

  const [mutation, { loading, error }] = useUpdateGitRepositoryMutation({
    variables: {
      id: repo.id,
      attributes: {
        url: gitUrl,
        ...(requireAuth
          ? authMethod === AuthMethod.Ssh
            ? { privateKey, passphrase, username: null, password: null }
            : { username, password, privateKey: null, passphrase: null }
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

  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update Git repository"
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
            Update
          </Button>
          <Button
            type="button"
            secondary
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
        }}
      >
        <FormField label="Git repository URL">
          <Input
            inputProps={{ ref: inputRef }}
            value={gitUrl}
            onChange={(e) => {
              setGitUrl(e.currentTarget.value)
            }}
            placeholder="https://host.com/your-repo.git"
            titleContent={<GitHubLogoIcon />}
          />
        </FormField>
        <Switch
          checked={requireAuth}
          onChange={(val) => setRequireAuth(val)}
        >
          Modify authorization info
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
          header="Problem updating repository"
          error={error}
        />
      )}
    </ModalAlt>
  )
}
