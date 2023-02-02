import { Box } from 'grommet'
import { ValidatedInput } from '@pluralsh/design-system'
import { useState } from 'react'
import { BindingInput } from 'components/utils/BindingInput'

export default function RoleFormGeneralAttributes({
  attributes,
  setAttributes,
  bindings,
  setBindings,
}: any) {
  const [repositories, setRepositories] = useState(attributes?.repositories?.join(', '))

  return (
    <Box
      flex={false}
      gap="small"
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
        add={user => setBindings([...bindings, { user }])}
        remove={email => setBindings(bindings.filter(({ user }) => !user || user.email !== email))}
      />
      <BindingInput
        type="group"
        hint="Groups that will receive this role"
        bindings={bindings
          .filter(({ group }) => !!group)
          .map(({ group: { name } }) => name)}
        add={group => setBindings([...bindings, { group }])}
        remove={name => setBindings(bindings.filter(({ group }) => !group || group.name !== name))}
      />
    </Box>
  )
}
