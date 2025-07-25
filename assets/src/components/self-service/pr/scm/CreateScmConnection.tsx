import { useCallback, useState } from 'react'
import { Button, Modal, PlusIcon } from '@pluralsh/design-system'
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

export const DEFAULT_SCM_ATTRIBUTES: Partial<ScmConnectionAttributes> = {
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
  const { state: formState, update: updateFormState } = useUpdateState<
    Partial<ScmConnectionAttributes>
  >(DEFAULT_SCM_ATTRIBUTES)

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
      if (allowSubmit)
        mutation({
          variables: { attributes: sanitizeScmAttributes(formState) },
        })
    },
    [allowSubmit, formState, mutation]
  )

  return (
    <Modal
      open={open}
      onClose={onClose || undefined}
      asForm
      size="large"
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
        small
        endIcon={<PlusIcon />}
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

export const sanitizeScmAttributes = (
  formState: Partial<ScmConnectionAttributes>
): ScmConnectionAttributes => {
  const { name, token, type, github } = formState

  return {
    name: name ?? '',
    type: type ?? ScmType.Github,
    ...(token === '' && type === ScmType.Github ? { github } : { token }),
    apiUrl: formState.apiUrl || null,
    baseUrl: formState.baseUrl || null,
    username: formState.username || null,
    signingPrivateKey: formState.signingPrivateKey || null,
  }
}
