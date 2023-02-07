import { P } from 'honorable'

export function DisplayText({ attributes, value }) {
  const attrs = attributes || {}
  const { size, ...rest } = attrs

  return (
    <P
      color="text-light"
      caption={size === 'small'}
      {...rest}
    >
      {attrs.value || value}
    </P>
  )
}
