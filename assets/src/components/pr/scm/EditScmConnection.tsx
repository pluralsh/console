import { type ComponentProps, useCallback, useState } from 'react'
import {
  Accordion,
  AccordionItem,
  Button,
  FormField,
  Input,
  Modal,
  Switch,
  Input2,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import pick from 'lodash/pick'

import {
  GithubAppAttributes,
  ScmConnectionAttributes,
  ScmConnectionFragment,
  ScmType,
  useUpdateScmConnectionMutation,
} from 'generated/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

import SshKeyUpload from 'components/cd/utils/SshKeyUpload'

import GitProviderSelect from './GitProviderSelect'
import { DEFAULT_ATTRIBUTES } from './CreateScmConnection'

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
    ...DEFAULT_ATTRIBUTES,
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
          apiUrl: formState.apiUrl || '',
          baseUrl: formState.baseUrl || '',
          username: formState.username || '',
          ...(!formState.token ? {} : { token: formState.token }),
          ...(formState.github && type === ScmType.Github
            ? { github: formState.github }
            : {}),
          ...(!formState.signingPrivateKey
            ? {}
            : { signingPrivateKey: formState.signingPrivateKey }),
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
  const theme = useTheme()
  const [ghAppAuth, setGhAppAuth] = useState(!!formState.github?.appId)

  const toggleGhAppAuth = (isToggled: boolean) => {
    setGhAppAuth(isToggled)
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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <GitProviderSelect
        selectedKey={formState.type}
        updateSelectedKey={(type) => updateFormState({ type })}
      />
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
        />
      </FormField>
      {ghAppAuth ? (
        <>
          <FormField
            label="App ID"
            required
          >
            <Input2
              value={formState.github?.appId}
              onChange={(e) => updateGhFormField('appId', e.target.value)}
            />
          </FormField>
          <FormField
            label="Installation ID"
            required
          >
            <Input2
              value={formState.github?.installationId}
              onChange={(e) =>
                updateGhFormField('installationId', e.target.value)
              }
            />
          </FormField>
          <SshKeyUpload
            privateKey={formState.github?.privateKey}
            setPrivateKey={(key) => updateGhFormField('privateKey', key)}
          />
        </>
      ) : (
        <FormField
          label="Token"
          required={type === 'create'}
        >
          <InputRevealer
            defaultRevealed={false}
            value={formState.token || ''}
            onChange={(e) => updateFormState({ token: e.target.value })}
          />
        </FormField>
      )}
      {formState.type === ScmType.Github && (
        <Switch
          checked={ghAppAuth}
          onChange={toggleGhAppAuth}
          css={{ alignSelf: 'flex-end' }}
        >
          Use GitHub App Auth
        </Switch>
      )}
      <Accordion type="single">
        <AccordionItem trigger="Advanced configuration">
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <FormField label="Base url">
              <Input2
                value={formState.baseUrl ?? ''}
                onChange={(e) => updateFormState({ baseUrl: e.target.value })}
              />
            </FormField>
            <FormField label="API url">
              <Input2
                value={formState.apiUrl ?? ''}
                onChange={(e) => updateFormState({ apiUrl: e.target.value })}
              />
            </FormField>
            <FormField label="User name">
              <Input2
                value={formState.username ?? ''}
                onChange={(e) => updateFormState({ username: e.target.value })}
              />
            </FormField>
            <FormField label="Signing private key">
              <Input
                value={formState.signingPrivateKey ?? ''}
                onChange={(e) =>
                  updateFormState({ signingPrivateKey: e.target.value })
                }
                multiline
              />
            </FormField>
          </div>
        </AccordionItem>
      </Accordion>
      {error && <GqlError error={error} />}
    </div>
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
