import { Modal } from '@pluralsh/design-system'
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import { useEffect, useMemo, useState } from 'react'

import pick from 'lodash/pick'

import { bindingToBindingAttributes } from './misc'

import { useUpdateRoleMutation } from 'generated/graphql'
import RoleForm from './RoleForm'

export default function RoleEdit({ role, open, setOpen }: any) {
  const [attributes, setAttributes] = useState(
    pick(role, ['name', 'description', 'repositories', 'permissions'])
  )
  const [roleBindings, setRoleBindings] = useState(role.roleBindings || [])
  const uniqueRoleBindings = useMemo(
    () => uniqWith(roleBindings, isEqual),
    [roleBindings]
  )
  const [mutation, { loading, error }] = useUpdateRoleMutation({
    variables: {
      id: role.id,
      attributes: {
        ...attributes,
        roleBindings: roleBindings.map(bindingToBindingAttributes),
      },
    },
    onCompleted: () => setOpen(false),
  })

  useEffect(
    () =>
      setAttributes(
        pick(role, ['name', 'description', 'repositories', 'permissions'])
      ),
    [role]
  )

  return (
    <Modal
      header="Edit role"
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
