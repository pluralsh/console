import { useCallback, useState } from 'react'
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

import {
  ScmConnectionAttributes,
  ScmConnectionsDocument,
  ScmType,
  useCreateScmConnectionMutation,
} from 'generated/graphql'
import { appendConnection, updateCache } from 'utils/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'

import { scmTypeToIcon, scmTypeToLabel } from '../PrScmConnectionsColumns'

const DEFAULT_ATTRIBUTES: Partial<ScmConnectionAttributes> = {
  apiUrl: '',
  baseUrl: '',
  name: '',
  signingPrivateKey: '',
  token: '',
  type: undefined,
  username: '',
}

export function CreateScmConnectionModal({
  refetch,
  open,
  onClose,
}: {
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const { state: formState, update: updateFormState } =
    useUpdateState<Partial<ScmConnectionAttributes>>(DEFAULT_ATTRIBUTES)

  const [mutation, { loading, error }] = useCreateScmConnectionMutation({
    update: (cache, { data }) =>
      updateCache(cache, {
        variables: {},
        query: ScmConnectionsDocument,
        update: (prev) =>
          appendConnection(prev, data?.createScmConnection, 'scmConnections'),
      }),
    onCompleted: () => {
      onClose?.()
      refetch?.()
    },
  })
  const { name, token, type } = formState
  const allowSubmit = name && token && type
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        const attributes: ScmConnectionAttributes = {
          name,
          token,
          type,
          apiUrl: formState.apiUrl || null,
          baseUrl: formState.baseUrl || null,
          username: formState.username || null,
          signingPrivateKey: formState.signingPrivateKey || null,
        }

        mutation({ variables: { attributes } })
      }
    },
    [
      allowSubmit,
      formState.apiUrl,
      formState.baseUrl,
      formState.signingPrivateKey,
      formState.username,
      mutation,
      name,
      token,
      type,
    ]
  )

  return (
    <ModalMountTransition open={open}>
      <Modal
        portal
        open={open}
        onClose={onClose}
        asForm
        onSubmit={onSubmit}
        header="Create a new connection"
        actions={
          <Button
            loading={loading}
            primary
            disabled={!allowSubmit}
            type="submit"
          >
            Create
          </Button>
        }
      >
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
              leftContent={
                !formState.type
                  ? undefined
                  : scmTypeToIcon[formState.type || '']
              }
              label="Select provider type"
              onSelectionChange={(key) =>
                updateFormState({ type: key as ScmType })
              }
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
            required
          >
            <Input2
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
                  onChange={(e) =>
                    updateFormState({ username: e.target.value })
                  }
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
      </Modal>
    </ModalMountTransition>
  )
}

export function CreateScmConnection({
  refetch,
}: {
  refetch: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        primary
        onClick={() => setOpen(true)}
      >
        Create connection
      </Button>
      <CreateScmConnectionModal
        open={open}
        refetch={refetch}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
