import { Flex } from '@pluralsh/design-system'
import { BindingInput } from 'components/utils/BindingInput'
import { PolicyBindingFragment } from 'generated/graphql'
import groupBy from 'lodash/groupBy'
import { useMemo } from 'react'

type Binding = Pick<PolicyBindingFragment, 'user' | 'group'>

export function FormBindings({
  bindings,
  setBindings,
  hints,
  showUsers = true,
  showGroups = true,
}: {
  bindings: any
  setBindings: any
  hints?: { app?: string; user?: string; group?: string }
  showUsers?: boolean
  showGroups?: boolean
}) {
  const { userBindings, groupBindings } = useMemo(() => {
    const { userBindings, groupBindings } = splitBindings(bindings)

    return {
      userBindings: (userBindings || []).map(({ user }) => user?.email),
      groupBindings: (groupBindings || []).map(({ group }) => group?.name),
    }
  }, [bindings])

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {showUsers && (
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
      )}
      {showGroups && (
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
      )}
    </Flex>
  )
}

export const bindingToBindingAttributes = ({
  id,
  user,
  group,
}: {
  id?: string | null | undefined
  user?: { id?: string } | null | undefined
  group?: { id?: string } | null | undefined
}) => ({
  ...(id && { id }),
  ...(user?.id && { userId: user.id }),
  ...(group?.id && { groupId: group.id }),
})

export const splitBindings = (bindings: Nullable<Binding>[]) =>
  groupBy(bindings, (binding) => {
    if (binding?.group) return 'groupBindings'
    if (binding?.user) return 'userBindings'
  }) as { groupBindings?: Binding[]; userBindings?: Binding[] }
