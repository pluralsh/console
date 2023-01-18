import { useMutation } from '@apollo/client'
import { Modal } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'

import { Actions } from '../../utils/Actions'
import { sanitize } from '../utils'

import { UPDATE_ROLE } from './queries'

import RoleForm from './RoleForm'

// TODO: Wrong role can open after creation > edit.
export default function RoleEdit({ role, open, setOpen }: any) {
  const [attributes, setAttributes] = useState({
    name: role.name,
    description: role.description,
    repositories: role.repositories,
    permissions: role.permissions,
  })
  const [roleBindings, setRoleBindings] = useState(role.roleBindings || [])
  const uniqueRoleBindings = useMemo(() => uniqWith(roleBindings, isEqual),
    [roleBindings])

  const [mutation, { loading, error }] = useMutation(UPDATE_ROLE, {
    variables: {
      id: role.id,
      attributes: { ...attributes, roleBindings: roleBindings.map(sanitize) },
    },
    onCompleted: () => setOpen(false),
  })

  return (
    <Modal
      header="Edit role"
      portal
      open={open}
      size="large"
      onClose={() => setOpen(false)}
      actions={(
        <Actions
          cancel={() => setOpen(false)}
          submit={() => mutation()}
          loading={loading}
          action="Update"
        />
      )}
    >
      <RoleForm
        attributes={attributes}
        setAttributes={setAttributes}
        bindings={uniqueRoleBindings}
        setBindings={setRoleBindings}
        error={error}
      />
    </Modal>
  )
}
