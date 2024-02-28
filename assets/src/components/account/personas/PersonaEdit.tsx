import { Modal, ValidatedInput } from '@pluralsh/design-system'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { Flex, usePrevious } from 'honorable'

import { Actions } from 'components/utils/Actions'

import { useUpdateState } from 'components/hooks/useUpdateState'

import { useUpdatePersonaMutation } from 'generated/graphql'

import { GqlError } from '../../utils/Alert'


export function EditPersonaMembers({ persona, open, onClose }: any) {
  const prevOpen = usePrevious(open)
  const [errorMsg, setErrorMsg] = useState<ReactNode>()

  const {
    state: formState,
    reset: resetForm,
    update,
    hasUpdates,
  } = useUpdateState({
    name: persona.name,
    description: persona.description,
    users: [],
  })
  const { name, description } = formState

  const [mutation, { loading, error }] = useUpdatePersonaMutation({
    variables: { id: persona.id, attributes: { name, description } },
    onCompleted: onClose,
  })

  const reset = useCallback(() => {
    resetForm()
    setErrorMsg(undefined)
  }, [resetForm])

  useEffect(() => {
    if (open && open !== prevOpen) {
      reset()
    }
  })
  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona attributes"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit attributes of ‘{persona.name}’</>}
      portal
      open={open}
      size="large"
      onClose={onClose}
      actions={
        <Actions
          cancel={onClose}
          submit={hasUpdates ? () => mutation() : undefined}
          loading={loading}
          action="Update"
        />
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {errorMsg}
        <ValidatedInput
          label="Name"
          value={name}
          onChange={({ target: { value } }) => update({ name: value })}
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => update({ description: value })}
        />
      </Flex>
    </Modal>
  )
}


export function EditPersonaAttributes({ persona, open, onClose }: any) {
  const prevOpen = usePrevious(open)
  const [errorMsg, setErrorMsg] = useState<ReactNode>()

  const {
    state: formState,
    reset: resetForm,
    update,
    hasUpdates,
  } = useUpdateState({
    name: persona.name,
    description: persona.description,
    users: [],
  })
  const { name, description } = formState

  const [mutation, { loading, error }] = useUpdatePersonaMutation({
    variables: { id: persona.id, attributes: { name, description } },
    onCompleted: onClose,
  })

  const reset = useCallback(() => {
    resetForm()
    setErrorMsg(undefined)
  }, [resetForm])

  useEffect(() => {
    if (open && open !== prevOpen) {
      reset()
    }
  })
  useEffect(() => {
    setErrorMsg(
      error && (
        <GqlError
          header="Problem editing persona attributes"
          error={error}
        />
      )
    )
  }, [error])

  return (
    <Modal
      header={<>Edit attributes of ‘{persona.name}’</>}
      portal
      open={open}
      size="large"
      onClose={onClose}
      actions={
        <Actions
          cancel={onClose}
          submit={hasUpdates ? () => mutation() : undefined}
          loading={loading}
          action="Update"
        />
      }
    >
      <Flex
        flexDirection="column"
        gap="large"
      >
        {errorMsg}
        <ValidatedInput
          label="Name"
          value={name}
          onChange={({ target: { value } }) => update({ name: value })}
        />
        <ValidatedInput
          label="Description"
          value={description}
          onChange={({ target: { value } }) => update({ description: value })}
        />
      </Flex>
    </Modal>
  )
}
