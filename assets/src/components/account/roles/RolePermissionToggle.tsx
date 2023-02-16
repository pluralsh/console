import {
  Div,
  Flex,
  P,
  Switch,
} from 'honorable'
import { useCallback } from 'react'

export default function RolePermissionToggle({
  permission,
  description,
  attributes,
  setAttributes,
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
    <Flex
      borderBottom={!last && '1px solid border'}
      justify="space-between"
      paddingVertical="small"
    >
      <div>
        <P
          body2
          fontWeight={600}
          textTransform="capitalize"
        >
          {permission.toLowerCase()}
        </P>
        <P
          body2
          color="text-light"
        >
          {description}
        </P>
      </div>
      <Switch
        checked={!!attributes.permissions.find(perm => perm === permission)}
        onChange={({ target: { checked } }) => toggle(checked)}
      />
    </Flex>
  )
}
