import { useCallback, useState } from 'react'
import { Button, Modal } from '@pluralsh/design-system'
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

import { ScmConnectionForm } from './EditScmConnection'

export const DEFAULT_ATTRIBUTES: Partial<ScmConnectionAttributes> = {
  apiUrl: '',
  baseUrl: '',
  name: '',
  signingPrivateKey: '',
  token: '',
  github: {
    appId: '',
    installationId: '',
    privateKey: '',
  },
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
  const { name, token, github, type } = formState
  const allowSubmit =
    name &&
    type &&
    (token || (github?.appId && github?.privateKey && github?.installationId))
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      if (allowSubmit) {
        const attributes: ScmConnectionAttributes = {
          name,
          type,
          ...(token === '' && type === ScmType.Github ? { github } : { token }),
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
      github,
      mutation,
      name,
      token,
      type,
    ]
  )

  return (
    <Modal
      open={open}
      onClose={onClose || undefined}
      asForm
      onSubmit={onSubmit}
      header="Create a new connection"
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
            Create
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
        {...{ type: 'create', formState, updateFormState, error }}
      />
    </Modal>
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
      <ModalMountTransition open={open}>
        <CreateScmConnectionModal
          open={open}
          refetch={refetch}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
