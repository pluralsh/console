import { useCallback, useMemo, useState } from 'react'
import { useMutation } from '@apollo/client'
import { Button } from 'honorable'
import { Modal } from '@pluralsh/design-system'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'

import { appendConnection, updateCache } from '../../../utils/graphql'

import { sanitize } from './misc'

import { CREATE_ROLE, ROLES_Q } from './queries'

import RoleForm from './RoleForm'

const defaultAttributes = {
  name: '',
  description: '',
  repositories: ['*'],
  permissions: [],
}

export default function RoleCreate({ q }: any) {
  const [open, setOpen] = useState(false)
  const [attributes, setAttributes] = useState(defaultAttributes)
  const [roleBindings, setRoleBindings] = useState([])
  const uniqueRoleBindings = useMemo(() => uniqWith(roleBindings, isEqual),
    [roleBindings])
  const resetAndClose = useCallback(() => {
    setAttributes(defaultAttributes)
    setRoleBindings([])
    setOpen(false)
  }, [])
  const [mutation, { loading, error }] = useMutation(CREATE_ROLE, {
    variables: {
      attributes: { ...attributes, roleBindings: roleBindings.map(sanitize) },
    },
    update: (cache, { data: { createRole } }) => updateCache(cache, {
      query: ROLES_Q,
      variables: { q },
      update: prev => appendConnection(prev, createRole, 'roles'),
    }),
    onCompleted: () => resetAndClose(),
  })

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >
        Create role
      </Button>
      <Modal
        open={open}
        onClose={() => resetAndClose()}
        marginVertical={16}
        size="large"
      >
        <RoleForm
          attributes={attributes}
          setAttributes={setAttributes}
          bindings={uniqueRoleBindings}
          setBindings={setRoleBindings}
          label="Create"
          cancel={() => resetAndClose()}
          submit={() => mutation()}
          loading={loading}
          error={error}
        />
      </Modal>
    </>
  )
}
