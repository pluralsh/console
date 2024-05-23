import { useTheme } from 'styled-components'

export function DisplayText({ attributes, value }) {
  const theme = useTheme()
  const attrs = attributes || {}
  const { size, ...rest } = attrs

  return (
    <p
      css={{
        color: theme.colors['text-light'],
        ...(size === 'small' && theme.partials.text.caption),
        ...rest,
      }}
    >
      {attrs.value || value}
    </p>
  )
}
