import { FormField, Input, Modal } from '@pluralsh/design-system'

import { useEffect, useMemo, useRef, useState } from 'react'

import { splitBindings } from '../settings/usermanagement/roles/RoleFormBindings'

import { BindingInput } from '../utils/BindingInput'

import { PolicyBindingFragment } from '../../generated/graphql'

import { useShareSecretContext } from './ShareSecretContext'

export default function ShareSecretModal() {
  const { open, setOpen } = useShareSecretContext()
  const [secretName, setSecretName] = useState('')
  const [secretString, setSecretString] = useState('')
  const [bindings, setBindings] = useState<
    Pick<PolicyBindingFragment, 'user' | 'group'>[]
  >([])
  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => inputRef.current?.focus?.(), [])

  const { userBindings, groupBindings } = useMemo(() => {
    const { userBindings, groupBindings } = splitBindings(bindings)

    return {
      userBindings: (userBindings || []).map(({ user }) => user?.email),
      groupBindings: (groupBindings || []).map(({ group }) => group?.name),
    }
  }, [bindings])

  return (
    <Modal
      header="Share secret"
      open={open}
      onClose={() => setOpen(false)}
    >
      <FormField
        required
        label="Secret name"
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={secretName}
          onChange={(e) => setSecretName(e.currentTarget.value)}
        />
      </FormField>
      <FormField
        required
        label="Secret string"
      >
        <Input
          value={secretString}
          onChange={(e) => setSecretString(e.currentTarget.value)}
        />
      </FormField>
      <BindingInput
        type="group"
        bindings={groupBindings}
        add={(group) => setBindings([...bindings, { group }])}
        remove={(name) =>
          setBindings(
            bindings.filter(({ group }) => !group || group.name !== name)
          )
        }
      />
      <BindingInput
        type="user"
        bindings={userBindings}
        add={(user) => setBindings([...bindings, { user }])}
        remove={(email) =>
          setBindings(
            bindings.filter(({ user }) => !user || user.email !== email)
          )
        }
      />
    </Modal>
  )
}
