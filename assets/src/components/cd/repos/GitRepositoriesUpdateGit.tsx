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
  GitRepositoryFragment,
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

export function UpdateGitRepository({ repo }: { repo: GitRepositoryFragment }) {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <>
      <Button
        secondary
        small
        onClick={() => setIsOpen(true)}
      >
        Update
      </Button>
      <ModalMountTransition open={isOpen}>
        <ModalForm
          open={isOpen}
          repo={repo}
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
}: {
  open: boolean
  repo: GitRepositoryFragment
  onClose: () => void
}) {
  const theme = useTheme()
  const [gitUrl, setGitUrl] = useState(repo.url)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const authMethod = getAuthMethodFromGitUrl(gitUrl)
  const [privateKey, setPrivateKey] = useState<GitAttributes['privateKey']>('')
  const [passphrase, setPassphrase] = useState<GitAttributes['passphrase']>('')
  const [username, setUsername] = useState<GitAttributes['username']>('')
  const [password, setPassword] = useState<GitAttributes['password']>('')
  const [recurseSubmodules, setRecurseSubmodules] = useState(
    repo.recurseSubmodules ?? false
  )

  const [mutation, { loading, error }] = useUpdateGitRepositoryMutation({
    variables: {
      id: repo.id,
      attributes: {
        url: gitUrl,
        recurseSubmodules,
        ...(showAdvanced
          ? authMethod === AuthMethod.Ssh
            ? { privateKey, passphrase, username: null, password: null }
            : { username, password, privateKey: null, passphrase: null }
          : {}),
      },
    },
    onCompleted: () => onClose(),
    awaitRefetchQueries: true,
    refetchQueries: [
      'GitRepositories',
      'HelmRepositories',
      'FluxHelmRepositories',
    ],
  })

  const disabled =
    !gitUrl ||
    (showAdvanced
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

  const inputRef = useRef<HTMLInputElement>(undefined)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <ModalAlt
      header="Update Git repository"
      open={open}
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
            checked={showAdvanced}
            onChange={(val) => setShowAdvanced(val)}
            css={{ flexGrow: 1 }}
          >
            Advanced configuration
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
      {showAdvanced && (
        <>
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
          <Switch
            checked={recurseSubmodules}
            onChange={setRecurseSubmodules}
          >
            Recurse submodules
          </Switch>
        </>
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
