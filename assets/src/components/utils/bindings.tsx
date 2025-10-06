import { ValidatedInput } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { BindingInput } from 'components/utils/BindingInput'
import { useTheme } from 'styled-components'
import groupBy from 'lodash/groupBy'
import { PolicyBindingFragment } from 'generated/graphql'

type Binding = Pick<PolicyBindingFragment, 'user' | 'group'>

export function FormBindings({
  attributes,
  setAttributes,
  bindings,
  setBindings,
  hints,
  showUsers = true,
  showGroups = true,
}: {
  attributes?: any
  setAttributes?: any
  bindings: any
  setBindings: any
  hints?: { app?: string; user?: string; group?: string }
  showUsers?: boolean
  showGroups?: boolean
}) {
  const theme = useTheme()
  const [repositories, setRepositories] = useState(
    attributes?.repositories?.join(', ')
  )

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
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
      }}
    >
      {attributes && (
        <ValidatedInput
          label="App bindings"
          hint="Target applications using a regex expression, e.g. “*” to select all."
          value={repositories}
          onChange={({ target: { value } }) => {
            setRepositories(value)
            setAttributes({ ...attributes, repositories: value.split(',') })
          }}
        />
      )}
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
    </div>
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
