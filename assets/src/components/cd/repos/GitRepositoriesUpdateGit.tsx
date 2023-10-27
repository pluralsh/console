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

import {
  GitAuthFields,
  getAuthMethodFromGitUrl,
} from './GitRepositoriesImportGit'

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
        : !username && !password
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
          <Switch
            checked={requireAuth}
            onChange={(val) => setRequireAuth(val)}
            css={{ flexGrow: 1 }}
          >
            Modify authorization info
          </Switch>
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
      </div>
      {requireAuth && (
        <GitAuthFields
          {...{
            authMethod,
            theme,
            privateKey,
            setPrivateKey,
            passphrase,
            setPassphrase,
            username,
            setUsername,
            password,
            setPassword,
          }}
        />
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
