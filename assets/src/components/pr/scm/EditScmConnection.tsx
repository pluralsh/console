import {
  Accordion,
  AccordionItem,
  Button,
  Flex,
  FormField,
  Input2,
  Modal,
} from '@pluralsh/design-system'
import pick from 'lodash/pick'
import { type ComponentProps, ReactNode, useCallback, useState } from 'react'
import { useTheme } from 'styled-components'

import {
  GithubAppAttributes,
  ScmConnectionAttributes,
  ScmConnectionFragment,
  ScmType,
  useUpdateScmConnectionMutation,
} from 'generated/graphql'

import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { ApolloError } from '@apollo/client'

import SshKeyUpload from 'components/cd/utils/SshKeyUpload'

import { DEFAULT_ATTRIBUTES } from './CreateScmConnection'
import GitProviderSelect from './GitProviderSelect'

function EditScmConnectionModalBase({
  open,
  onClose,
  scmConnection,
}: {
  open: boolean
  onClose: Nullable<() => void>
  scmConnection: ScmConnectionFragment
}) {
  const theme = useTheme()
  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState<Partial<ScmConnectionAttributes>>({
    ...pick(scmConnection, [
      'apiUrl',
      'baseUrl',
      'name',
      'signingPrivateKey',
      'token',
      'type',
      'username',
      'github',
    ]),
  })

  const [mutation, { loading, error }] = useUpdateScmConnectionMutation({
    onCompleted: () => {
      onClose?.()
    },
  })

  const { name, type } = formState
  const allowSubmit = name && type && hasUpdates
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (allowSubmit) {
        const attributes = {
          name,
          type,
          ...(formState.apiUrl ? { apiUrl: formState.apiUrl } : {}),
          ...(formState.baseUrl ? { baseUrl: formState.baseUrl } : {}),
          ...(formState.username ? { username: formState.username } : {}),
          ...(formState.token ? { token: formState.token } : {}),
          ...(formState.github && type === ScmType.Github
            ? { github: formState.github }
            : {}),
          ...(formState.signingPrivateKey
            ? { signingPrivateKey: formState.signingPrivateKey }
            : {}),
        }

        mutation({ variables: { id: scmConnection.id, attributes } })
      }
    },
    [allowSubmit, formState, mutation, name, scmConnection.id, type]
  )

  return (
    <Modal
      open={open}
      onClose={onClose || undefined}
      asForm
      size="large"
      onSubmit={onSubmit}
      header={`Update connection - ${scmConnection.name}`}
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            loading={loading}
            primary
            disabled={!allowSubmit}
            type="submit"
          >
            Update
          </Button>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <ScmConnectionForm
        {...{ type: 'update', formState, updateFormState, error }}
      />
    </Modal>
  )
}

export function ScmConnectionForm({
  type,
  formState,
  updateFormState,
  error,
}: {
  type: 'update' | 'create'
  formState: Partial<ScmConnectionAttributes>
  updateFormState: (update: Partial<ScmConnectionAttributes>) => void
  error: ApolloError | undefined
}) {
  const { colors } = useTheme()
  const [ghAppAuth, setGhAppAuthState] = useState(!!formState.github?.appId)

  const setGhAppAuth = (isToggled: boolean) => {
    setGhAppAuthState(isToggled)
    updateFormState({
      token: !isToggled ? undefined : DEFAULT_ATTRIBUTES.token,
      github: isToggled ? DEFAULT_ATTRIBUTES.github : undefined,
    })
  }

  const updateGhFormField = (key: string, val: Nullable<string>) => {
    updateFormState({
      github: {
        ...formState.github,
        [key]: val,
      } as GithubAppAttributes,
    })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <GitProviderSelect
        selectedKey={formState.type}
        updateSelectedKey={(type) => updateFormState({ type })}
        ghAppAuth={ghAppAuth}
        setGhAppAuth={setGhAppAuth}
      />
      <StretchedInputRow>
        <FormField
          label="Name"
          required
        >
          <Input2
            css={{ background: colors['fill-two'] }}
            placeholder="Enter name"
            value={formState.name}
            onChange={(e) => updateFormState({ name: e.target.value })}
          />
        </FormField>
        {!ghAppAuth && (
          <FormField
            label="Token"
            required={type === 'create'}
          >
            <InputRevealer
              css={{ background: colors['fill-two'] }}
              placeholder="Enter access token"
              defaultRevealed={false}
              value={formState.token || ''}
              onChange={(e) => updateFormState({ token: e.target.value })}
            />
          </FormField>
        )}
      </StretchedInputRow>
      {ghAppAuth && (
        <>
          <StretchedInputRow>
            <FormField
              label="App ID"
              required
            >
              <Input2
                css={{ background: colors['fill-two'] }}
                placeholder="Enter app ID"
                value={formState.github?.appId}
                onChange={(e) => updateGhFormField('appId', e.target.value)}
              />
            </FormField>
            <FormField
              label="Installation ID"
              required
            >
              <Input2
                css={{ background: colors['fill-two'] }}
                placeholder="Enter installation ID"
                value={formState.github?.installationId}
                onChange={(e) =>
                  updateGhFormField('installationId', e.target.value)
                }
              />
            </FormField>
          </StretchedInputRow>
          <SshKeyUpload
            fillLevel={2}
            privateKey={formState.github?.privateKey}
            setPrivateKey={(key) => updateGhFormField('privateKey', key)}
          />
        </>
      )}
      <Accordion type="single">
        <AccordionItem trigger="Advanced configuration">
          <Flex
            direction="column"
            gap="medium"
          >
            <StretchedInputRow>
              <FormField label="Base URL">
                <Input2
                  css={{ background: colors['fill-three'] }}
                  placeholder="Enter base URL"
                  value={formState.baseUrl ?? ''}
                  onChange={(e) => updateFormState({ baseUrl: e.target.value })}
                />
              </FormField>
              <FormField label="API URL">
                <Input2
                  css={{ background: colors['fill-three'] }}
                  placeholder="Enter API URL"
                  value={formState.apiUrl ?? ''}
                  onChange={(e) => updateFormState({ apiUrl: e.target.value })}
                />
              </FormField>
            </StretchedInputRow>
            <FormField label="Username">
              <Input2
                css={{ background: colors['fill-three'] }}
                placeholder="Enter username"
                value={formState.username ?? ''}
                onChange={(e) => updateFormState({ username: e.target.value })}
              />
            </FormField>
            <SshKeyUpload
              fillLevel={2}
              label="Signing private key"
              required={false}
              privateKey={formState.signingPrivateKey ?? ''}
              setPrivateKey={(key) =>
                updateFormState({ signingPrivateKey: key })
              }
            />
          </Flex>
        </AccordionItem>
      </Accordion>
      {error && <GqlError error={error} />}
    </Flex>
  )
}

export function EditScmConnectionModal(
  props: ComponentProps<typeof EditScmConnectionModalBase>
) {
  return (
    <ModalMountTransition open={props.open}>
      <EditScmConnectionModalBase {...props} />
    </ModalMountTransition>
  )
}

function StretchedInputRow({ children }: { children: ReactNode }) {
  return (
    <Flex
      gap="medium"
      width="100%"
      {...{ '& > *': { flex: 1 } }}
    >
      {children}
    </Flex>
  )
}
