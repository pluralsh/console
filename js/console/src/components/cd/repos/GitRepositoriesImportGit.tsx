import {
  Button,
  FormField,
  GitHubLogoIcon,
  Input,
  Switch,
} from '@pluralsh/design-system'
import {
  AuthMethod,
  CreateGitRepositoryMutation,
  GitAttributes,
  useCreateGitRepositoryMutation,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import {
  Dispatch,
  FormEvent,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import ModalAlt, { StepH } from '../ModalAlt'
import { PrepareGitStep } from '../PrepareGitStep'
import SshKeyUpload from '../utils/SshKeyUpload'

export type ImportedGitRepository = NonNullable<
  CreateGitRepositoryMutation['createGitRepository']
>

export function ImportGit() {
  const [isOpen, setIsOpen] = useState(false)
  const closeModal = useCallback(() => setIsOpen(false), [])

  return (
    <>
      <Button
        primary
        onClick={() => setIsOpen(true)}
      >
        Import Git
      </Button>
      <ModalMountTransition open={isOpen}>
        <ImportGitModal
          open={isOpen}
          onClose={closeModal}
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
}: {
  open: boolean
  onClose: () => void
}) {
  const formState = useGitRepositoryImport({
    onCompleted: onClose,
  })

  const initialFocusRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      initialFocusRef.current?.focus?.()
    }
  }, [open])

  return (
    <ModalAlt
      header="Import Git"
      open={open}
      onClose={onClose}
      asForm
      formProps={{ onSubmit: formState.onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={formState.disabled}
            loading={formState.loading}
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
          <div css={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Switch
              checked={formState.showAdvanced}
              onChange={(val) => formState.setShowAdvanced(val)}
              css={{ width: 'fit-content' }}
            >
              Advanced configuration
            </Switch>
          </div>
        </>
      }
    >
      <GitRepositoryImportFields
        formState={formState}
        inputRef={initialFocusRef}
      />
    </ModalAlt>
  )
}

export function useGitRepositoryImport({
  onCompleted,
  onImported,
}: {
  onCompleted?: () => void
  onImported?: (repository: ImportedGitRepository) => void
} = {}) {
  const [gitUrl, setGitUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const authMethod = getAuthMethodFromGitUrl(gitUrl)
  const [privateKey, setPrivateKey] = useState<GitAttributes['privateKey']>('')
  const [passphrase, setPassphrase] = useState<GitAttributes['passphrase']>('')
  const [username, setUsername] = useState<GitAttributes['username']>('')
  const [password, setPassword] = useState<GitAttributes['password']>('')
  const [recurseSubmodules, setRecurseSubmodules] = useState(false)

  const [mutation, { loading, error }] = useCreateGitRepositoryMutation({
    variables: {
      attributes: {
        url: gitUrl,
        recurseSubmodules,
        ...(showAdvanced
          ? authMethod === AuthMethod.Ssh
            ? { privateKey, passphrase }
            : { username, password }
          : {}),
      },
    },
    onCompleted: (data) => {
      onCompleted?.()
      if (data.createGitRepository) onImported?.(data.createGitRepository)
    },
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

  return {
    authMethod,
    disabled,
    error,
    gitUrl,
    loading,
    passphrase,
    password,
    privateKey,
    recurseSubmodules,
    setGitUrl,
    setPassphrase,
    setPassword,
    setPrivateKey,
    setRecurseSubmodules,
    setShowAdvanced,
    setUsername,
    showAdvanced,
    username,
    onSubmit,
  }
}

export type GitRepositoryImportFormState = ReturnType<
  typeof useGitRepositoryImport
>

export function GitRepositoryImportFields({
  formState,
  inputRef,
}: {
  formState: GitRepositoryImportFormState
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const theme = useTheme()

  return (
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
          inputProps={{ ref: inputRef }}
          value={formState.gitUrl}
          onChange={(e) => {
            formState.setGitUrl(e.currentTarget.value)
          }}
          placeholder="https://host.com/your-repo.git"
          titleContent={<GitHubLogoIcon />}
        />
      </div>
      {formState.showAdvanced && (
        <>
          <GitAuthFields
            authMethod={formState.authMethod}
            privateKey={formState.privateKey}
            setPrivateKey={formState.setPrivateKey}
            passphrase={formState.passphrase}
            setPassphrase={formState.setPassphrase}
            username={formState.username}
            setUsername={formState.setUsername}
            password={formState.password}
            setPassword={formState.setPassword}
          />
          <Switch
            checked={formState.recurseSubmodules}
            onChange={formState.setRecurseSubmodules}
          >
            Recurse submodules
          </Switch>
        </>
      )}
      {formState.error && (
        <GqlError
          header="Problem importing repository"
          error={formState.error}
        />
      )}
    </>
  )
}

export function GitAuthFields({
  authMethod,
  privateKey,
  setPrivateKey,
  passphrase,
  setPassphrase,
  username,
  setUsername,
  password,
  setPassword,
}: {
  authMethod: AuthMethod
  privateKey: Nullable<string>
  setPrivateKey: Dispatch<SetStateAction<Nullable<string>>>
  passphrase: Nullable<string>
  setPassphrase: Dispatch<SetStateAction<Nullable<string>>>
  username: Nullable<string>
  setUsername: Dispatch<SetStateAction<Nullable<string>>>
  password: Nullable<string>
  setPassword: Dispatch<SetStateAction<Nullable<string>>>
}) {
  const theme = useTheme()

  return authMethod === AuthMethod.Ssh ? (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
        '> *': {
          flexGrow: 1,
        },
      }}
    >
      <SshKeyUpload
        privateKey={privateKey}
        setPrivateKey={setPrivateKey}
      />
      <FormField label="Passphrase">
        <Input
          inputProps={{ type: 'password' }}
          value={passphrase}
          onChange={(e) => {
            setPassphrase(e.currentTarget.value)
          }}
          placeholder="Passphrase"
        />
      </FormField>
    </div>
  ) : (
    <div
      css={{
        display: 'flex',
        columnGap: theme.spacing.small,
        '> *': {
          flexGrow: 1,
        },
      }}
    >
      <FormField label="User name">
        <Input
          value={username}
          onChange={(e) => {
            setUsername(e.currentTarget.value)
          }}
          placeholder="User name"
        />
      </FormField>
      <FormField label="Password">
        <Input
          inputProps={{ type: 'password' }}
          value={password}
          onChange={(e) => {
            setPassword(e.currentTarget.value)
          }}
          placeholder="Password"
        />
      </FormField>
    </div>
  )
}
