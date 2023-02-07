import { Markdown } from '@pluralsh/design-system'

export function DisplayMarkdown({ attributes: { value, ...rest } }) {
  if (!value) return null

  return (
    <Markdown
      text={value}
      {...rest}
    />
  )
}
