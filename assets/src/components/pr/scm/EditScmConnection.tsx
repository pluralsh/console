import { type ComponentProps, useCallback } from 'react'
import {
  Accordion,
  Button,
  FormField,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import Input2 from '@pluralsh/design-system/dist/components/Input2'
import { useTheme } from 'styled-components'
import pick from 'lodash/pick'

import {
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

import { scmTypeToIcon, scmTypeToLabel } from '../PrScmConnectionsColumns'

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
  } = useUpdateState<Partial<ScmConnectionAttributes>>(
    pick(scmConnection, [
      'apiUrl',
      'baseUrl',
      'name',
      'signingPrivateKey',
      'token',
      'type',
      'username',
    ])
  )

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
          token: formState.token || null,
          apiUrl: formState.apiUrl || null,
          baseUrl: formState.baseUrl || null,
          username: formState.username || null,
          signingPrivateKey: formState.signingPrivateKey || null,
        }

        // @ts-expect-error
        mutation({ variables: { id: scmConnection.id, attributes } })
      }
    },
    [
      allowSubmit,
      formState.apiUrl,
      formState.baseUrl,
      formState.signingPrivateKey,
      formState.token,
      formState.username,
      mutation,
      name,
      scmConnection.id,
      type,
    ]
  )

  return (
    <Modal
      portal
      open={open}
      onClose={onClose}
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

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <FormField
        label="Provider type"
        required
      >
        <Select
          selectedKey={formState.type}
          leftContent={
            !formState.type ? undefined : scmTypeToIcon[formState.type || '']
          }
          label="Select provider type"
          onSelectionChange={(key) => updateFormState({ type: key as ScmType })}
        >
          {[ScmType.Github, ScmType.Gitlab].map((type) => (
            <ListBoxItem
              key={type}
              leftContent={scmTypeToIcon[type]}
              label={scmTypeToLabel[type]}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
        />
      </FormField>
      <FormField
        label="Token"
        required={type === 'create'}
      >
        <InputRevealer
          defaultRevealed={false}
          value={formState.token}
          onChange={(e) => updateFormState({ token: e.target.value })}
        />
      </FormField>
      <Accordion label="Advanced configuration">
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
            <InputRevealer
              defaultRevealed={false}
              value={formState.signingPrivateKey ?? ''}
              onChange={(e) =>
                updateFormState({ signingPrivateKey: e.target.value })
              }
            />
          </FormField>
        </div>
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
