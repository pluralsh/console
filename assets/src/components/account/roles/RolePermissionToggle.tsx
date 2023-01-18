import { ListItem } from 'components/utils/ListItem'
import { Box } from 'grommet'
import { Span, Switch } from 'honorable'
import { useCallback } from 'react'

export default function RolePermissionToggle({
  permission,
  description,
  attributes,
  setAttributes,
  first,
  last,
}: any) {
  const toggle = useCallback(enable => {
    if (enable) {
      setAttributes({
        ...attributes,
        permissions: [permission, ...attributes.permissions],
      })
    }
    else {
      setAttributes({
        ...attributes,
        permissions: attributes.permissions.filter(perm => perm !== permission),
      })
    }
  },
  [permission, attributes, setAttributes])

  return (
    <ListItem
      first={first}
      last={last}
      background="fill-two"
    >
      <Box fill="horizontal">
        <Span fontWeight={500}>{permission.toLowerCase()}</Span>
        <Span color="text-light">{description}</Span>
      </Box>
      <Switch
        checked={!!attributes.permissions.find(perm => perm === permission)}
        onChange={({ target: { checked } }) => toggle(checked)}
      />
    </ListItem>
  )
}
