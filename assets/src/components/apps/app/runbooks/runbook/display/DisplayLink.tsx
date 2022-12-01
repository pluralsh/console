import { Anchor, Text } from 'grommet'

import { recurse } from './misc'

export function DisplayLink({ value, attributes, children }) {
  const val = value || attributes.value

  return (
    <Anchor {...attributes}>
      <Text
        size="small"
        {...attributes}
      >
        {val || recurse(children)}
      </Text>
    </Anchor>
  )
}
