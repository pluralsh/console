import { Switch } from '@pluralsh/design-system'
import { useCallback } from 'react'
import { useTheme } from 'styled-components'

export default function RolePermissionToggle({
  permission,
  description,
  attributes,
  setAttributes,
  last,
}: any) {
  const theme = useTheme()
  const toggle = useCallback(
    (enable) => {
      if (enable) {
        setAttributes({
          ...attributes,
          permissions: [permission, ...attributes.permissions],
        })
      } else {
        setAttributes({
          ...attributes,
          permissions: attributes.permissions.filter(
            (perm) => perm !== permission
          ),
        })
      }
    },
    [permission, attributes, setAttributes]
  )

  return (
    <div
      css={{
        display: 'flex',
        borderBottom: !last ? theme.borders.default : undefined,
        justifyContent: 'space-between',
        paddingTop: theme.spacing.small,
        paddingBottom: theme.spacing.small,
      }}
    >
      <div>
        <p
          css={{
            ...theme.partials.text.body2Bold,
            textTransform: 'capitalize',
          }}
        >
          {permission.toLowerCase()}
        </p>
        <p
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          {description}
        </p>
      </div>
      <Switch
        checked={!!attributes.permissions.find((perm) => perm === permission)}
        onChange={(checked) => toggle(checked)}
      />
    </div>
  )
}
