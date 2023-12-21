import { splitBindings } from 'components/account/roles/RoleFormBindings'
import { BindingInput } from 'components/utils/BindingInput'
import { PolicyBindingFragment } from 'generated/graphql'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import { SetBindingsType } from './GlobalSettingsPermissions'

export default function ReadWriteBindings({
  bindings: bindingsProp,
  setBindings,
  hints,
}: {
  bindings: Nullable<Nullable<PolicyBindingFragment>[]>
  setBindings: SetBindingsType
  hints?: { user?: string; group?: string }
}) {
  const theme = useTheme()
  const bindings = (bindingsProp || []).filter(isNonNullable)

  const { userBindings, groupBindings } = useMemo(() => {
    const { userBindings, groupBindings } = splitBindings(bindings)

    return {
      userBindings: (userBindings || []).map(({ user }) => user?.email),
      groupBindings: (groupBindings || []).map(({ group }) => group?.name),
    }
  }, [bindings])

  return (
    <div
      css={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: theme.spacing.xlarge,
        '& > *': {
          flexBasis: '50%',
          flexGrow: 1,
          flexShrink: 1,
        },
      }}
    >
      <BindingInput
        type="user"
        hint={hints?.user || 'Users that will receive this role'}
        bindings={userBindings}
        add={(user) => setBindings([...bindings, { user }])}
        remove={(email) =>
          setBindings(
            bindings.filter(({ user }) => !user || user.email !== email)
          )
        }
      />
      <BindingInput
        type="group"
        hint={hints?.group || 'Groups that will receive this role'}
        bindings={groupBindings}
        add={(group) => setBindings([...bindings, { group }])}
        remove={(name) =>
          setBindings(
            bindings.filter(({ group }) => !group || group.name !== name)
          )
        }
      />
    </div>
  )
}
