import React from 'react'

import { StackFragment, useStackBindingsQuery } from '../../generated/graphql'
import {
  PermissionsIdType,
  PermissionsModal,
} from '../cd/utils/PermissionsModal'

export default function StackPermissionsModal({
  stack,
  open,
  onClose,
}: {
  stack: StackFragment
  open: boolean
  onClose: () => void
}) {
  const { data, refetch } = useStackBindingsQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id || !open,
  })

  const bindings = data?.infrastructureStack

  if (!bindings) {
    return null
  }

  return (
    <PermissionsModal
      header="Manage stack permissions"
      name={stack.name}
      bindings={bindings}
      id={stack.id ?? ''}
      type={PermissionsIdType.Stack}
      refetch={refetch}
      open={open}
      onClose={onClose}
    />
  )
}
