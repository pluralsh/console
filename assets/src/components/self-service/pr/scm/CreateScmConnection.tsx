import { useCallback, useState } from 'react'
import { Button, Modal, PlusIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  ScmConnectionAttributes,
  ScmConnectionsDocument,
  ScmType,
  useCreateScmConnectionMutation,
} from 'generated/graphql'
import { appendConnection, deepOmitFalsy, updateCache } from 'utils/graphql'

import { useUpdateState } from 'components/hooks/useUpdateState'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { ScmConnectionForm } from './EditScmConnection'

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
    useUpdateState<ScmConnectionAttributes>({ type: ScmType.Github, name: '' })

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

  const allowSubmit = isValidScmForm(formState)
  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (allowSubmit)
        mutation({
          variables: { attributes: sanitizeScmAttributes(formState) },
        })
    },
    [allowSubmit, mutation, formState]
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

// all forms need a name
// gh auth only needs gh info (no token)
// all other forms require a token
// azure devops also requires azure info
export const isValidScmForm = (
  formState: ScmConnectionAttributes,
  requireToken = true
): boolean => {
  const { name, type, token, github, azure } = formState
  if (!name) return false
  if (!!github)
    return !!github.appId && !!github.privateKey && !!github.installationId
  if (requireToken && !token) return false
  if (type === ScmType.AzureDevops)
    return !!azure?.username && !!azure?.organization && !!azure?.project
  return true
}

export const sanitizeScmAttributes = (
  formState: ScmConnectionAttributes
): ScmConnectionAttributes => {
  const type = formState.type
  const { github, azure, token, ...rest } = deepOmitFalsy(formState)
  if (type === ScmType.Github)
    return { ...(github ? { github } : { token }), ...rest }
  if (type === ScmType.AzureDevops) return { azure, token, ...rest }
  return { token, ...rest }
}
