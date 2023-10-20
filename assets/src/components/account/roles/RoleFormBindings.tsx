import { ValidatedInput } from '@pluralsh/design-system'
import { useState } from 'react'
import { BindingInput } from 'components/utils/BindingInput'
import { useTheme } from 'styled-components'

export default function RoleFormBindings({
  attributes,
  setAttributes,
  bindings,
  setBindings,
}: any) {
  const theme = useTheme()
  const [repositories, setRepositories] = useState(
    attributes?.repositories?.join(', ')
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
      }}
    >
      <ValidatedInput
        label="App bindings"
        hint="Target applications using a regex expression, e.g. “*” to select all."
        value={repositories}
        onChange={({ target: { value } }) => {
          setRepositories(value)
          setAttributes({ ...attributes, repositories: value.split(',') })
        }}
      />
      <BindingInput
        type="user"
        hint="Users that will receive this role"
        bindings={bindings
          .filter(({ user }) => !!user)
          .map(({ user: { email } }) => email)}
        add={(user) => setBindings([...bindings, { user }])}
        remove={(email) =>
          setBindings(
            bindings.filter(({ user }) => !user || user.email !== email)
          )
        }
      />
      <BindingInput
        type="group"
        hint="Groups that will receive this role"
        bindings={bindings
          .filter(({ group }) => !!group)
          .map(({ group: { name } }) => name)}
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
