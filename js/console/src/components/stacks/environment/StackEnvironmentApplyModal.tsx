import { useEffect, useRef } from 'react'
import { Button, FormField, Input2, Switch } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'

import { useUpdateState } from '../../hooks/useUpdateState'
import { GqlError } from '../../utils/Alert'
import ModalAlt from '../../cd/ModalAlt'
import {
  StackEnvironment,
  useUpdateStackMutation,
} from '../../../generated/graphql'

import { StackOutletContextT } from '../Stacks'

export default function StackEnvironmentApplyModal({
  open,
  onClose,
  initialValue = { name: '', value: '', secret: false },
  mode = 'create',
}: {
  open: boolean
  onClose: () => void
  mode?: 'edit' | 'create'
  initialValue?: StackEnvironment
}) {
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const {
    state: { name, value, secret },
    hasUpdates,
    update,
  } = useUpdateState(initialValue)
  const nameRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit') {
      valueRef.current?.focus?.()
    } else {
      nameRef.current?.focus?.()
    }
  }, [mode])

  const disabled = !hasUpdates || !name || !value

  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stack.id ?? '',
      attributes: {
        name: stack.name,
        type: stack.type,
        configuration: {
          image: stack.configuration.image,
          version: stack.configuration.version,
        },
        clusterId: stack.cluster?.id ?? '',
        repositoryId: stack.repository?.id ?? '',
        git: { folder: stack.git.folder, ref: stack.git.ref },
        environment: [
          ...(stack.environment?.filter((e) => e?.name !== name) ?? []),
          { name, value, secret },
        ].map((e) => ({
          name: e?.name ?? '',
          value: e?.value ?? '',
          secret: e?.secret,
        })),
      },
    },
    onCompleted: () => {
      refetch?.()
      onClose?.()
    },
  })

  return (
    <ModalAlt
      header={
        mode === 'edit'
          ? 'Edit environment variable'
          : 'Add environment variable'
      }
      open={open}
      onClose={onClose}
      asForm
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (!disabled) {
            mutation()
          }
        },
      }}
      actions={
        <>
          <Button
            primary
            type="submit"
            disabled={disabled}
            loading={loading}
          >
            {mode === 'edit'
              ? 'Update environment variable'
              : 'Add environment variable'}
          </Button>
          <Button
            secondary
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <FormField label="Name">
        <Input2
          value={name}
          disabled={mode === 'edit'}
          onChange={(e) => {
            if (mode === 'create') update({ name: e.target.value })
          }}
          inputProps={{ ref: nameRef }}
        />
      </FormField>
      <FormField label="Value">
        <Input2
          value={value}
          onChange={(e) => update({ value: e.target.value })}
          inputProps={{
            ref: valueRef,
            type: secret ? 'password' : 'text',
          }}
        />
      </FormField>
      <Switch
        checked={!!secret}
        onChange={(e) => update({ secret: e })}
      >
        Secret
      </Switch>
      {error && <GqlError error={error} />}
    </ModalAlt>
  )
}
