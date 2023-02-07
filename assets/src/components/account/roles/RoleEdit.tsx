import { useMutation } from '@apollo/client'
import { Modal } from '@pluralsh/design-system'
import { useEffect, useMemo, useState } from 'react'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'

import pick from 'lodash/pick'

import { sanitize } from './misc'

import { UPDATE_ROLE } from './queries'

import RoleForm from './RoleForm'

export default function RoleEdit({ role, open, setOpen }: any) {
  const [attributes, setAttributes] = useState(pick(role, ['name', 'description', 'repositories', 'permissions']))
  const [roleBindings, setRoleBindings] = useState(role.roleBindings || [])
  const uniqueRoleBindings = useMemo(() => uniqWith(roleBindings, isEqual), [roleBindings])
  const [mutation, { loading, error }] = useMutation(UPDATE_ROLE, {
    variables: { id: role.id, attributes: { ...attributes, roleBindings: roleBindings.map(sanitize) } },
    onCompleted: () => setOpen(false),
  })

  useEffect(() => setAttributes(pick(role, ['name', 'description', 'repositories', 'permissions'])), [role])

  return (
    <Modal
      header="Edit role"
      portal
      open={open}
      size="large"
      onClose={() => setOpen(false)}
    >
      <RoleForm
        attributes={attributes}
        setAttributes={setAttributes}
        bindings={uniqueRoleBindings}
        setBindings={setRoleBindings}
        label="Update"
        cancel={() => setOpen(false)}
        submit={() => mutation()}
        loading={loading}
        error={error}
      />
    </Modal>
  )
}
