import {
  Accordion,
  AccordionItem,
  Button,
  Flex,
  FormField,
  Input2,
  Modal,
} from '@pluralsh/design-system'
import { type ComponentProps, ReactNode, useCallback } from 'react'
import { useTheme } from 'styled-components'

import {
  AzureDevopsAttributes,
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

import { DeepPartial } from '@apollo/client/utilities'
import { pick } from 'lodash'
import { isValidScmForm, sanitizeScmAttributes } from './CreateScmConnection'
import GitProviderSelect from './GitProviderSelect'

type ScmFormAuthType = 'basic' | 'ghApp' | 'azureDevops'
type GhFormField = keyof GithubAppAttributes
type AzureFormField = keyof AzureDevopsAttributes

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
  } = useUpdateState<ScmConnectionAttributes>({
    ...(pick(scmConnection, [
      'apiUrl',
      'baseUrl',
      'name',
      'signingPrivateKey',
      'token',
      'type',
      'username',
      'github',
      'azure',
    ]) as ScmConnectionAttributes),
  })

  const [mutation, { loading, error }] = useUpdateScmConnectionMutation({
    onCompleted: () => {
      onClose?.()
    },
  })

  const allowSubmit = hasUpdates && isValidScmForm(formState, false)
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (allowSubmit) {
        mutation({
          variables: {
            id: scmConnection.id,
            attributes: sanitizeScmAttributes(formState),
          },
        })
      }
    },
    [allowSubmit, formState, mutation, scmConnection.id]
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
  readOnlyName,
}: {
  type: 'update' | 'create'
  formState: ScmConnectionAttributes
  updateFormState: (update: DeepPartial<ScmConnectionAttributes>) => void
  error: ApolloError | undefined
  readOnlyName?: boolean
}) {
  const { colors } = useTheme()
  const authType = authTypeFromFormState(formState)

  const setGhAppAuth = (isToggled: boolean) => {
    updateFormState(
      isToggled ? { github: { appId: '' }, token: null } : { github: null }
    )
  }

  const updateGhFormField = (key: GhFormField, val: Nullable<string>) => {
    updateFormState({ github: { ...formState.github, [key]: val } })
  }
  const updateAzureFormField = (key: AzureFormField, val: Nullable<string>) => {
    updateFormState({ azure: { ...formState.azure, [key]: val } })
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <GitProviderSelect
        selectedKey={formState.type}
        updateSelectedKey={(type) =>
          updateFormState({ type, github: null, azure: null })
        }
        ghAppAuth={authType === 'ghApp'}
        setGhAppAuth={setGhAppAuth}
      />
      <StretchedInputRow>
        <FormField
          label="Name"
          required
        >
          <Input2
            disabled={readOnlyName}
            css={{ background: colors['fill-two'] }}
            placeholder="Enter name"
            value={formState.name}
            onChange={(e) => updateFormState({ name: e.target.value })}
          />
        </FormField>
        {authType !== 'ghApp' && (
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
      {authType === 'azureDevops' && (
        <>
          <StretchedInputRow>
            <FormField
              required
              label="Username"
            >
              <Input2
                css={{ background: colors['fill-two'] }}
                placeholder="Enter username"
                value={formState.azure?.username ?? ''}
                onChange={(e) =>
                  updateAzureFormField('username', e.target.value)
                }
              />
            </FormField>
            <FormField
              required
              label="Organization"
            >
              <Input2
                css={{ background: colors['fill-two'] }}
                placeholder="Enter organization"
                value={formState.azure?.organization ?? ''}
                onChange={(e) =>
                  updateAzureFormField('organization', e.target.value)
                }
              />
            </FormField>
            <FormField
              required
              label="Project"
            >
              <Input2
                css={{ background: colors['fill-two'] }}
                placeholder="Enter project"
                value={formState.azure?.project ?? ''}
                onChange={(e) =>
                  updateAzureFormField('project', e.target.value)
                }
              />
            </FormField>
          </StretchedInputRow>
        </>
      )}
      {authType === 'ghApp' && (
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

const authTypeFromFormState = (
  formState: ScmConnectionAttributes
): ScmFormAuthType => {
  switch (formState.type) {
    case ScmType.AzureDevops:
      return 'azureDevops'
    case ScmType.Github:
      return formState.github?.appId !== undefined ? 'ghApp' : 'basic'
    default:
      return 'basic'
  }
}
