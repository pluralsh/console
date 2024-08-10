import { useTheme } from 'styled-components'

import { recurse } from './misc'

export function DisplayLink({ value, attributes, children }) {
  const theme = useTheme()
  const val = value || attributes.value

  return (
    <a {...attributes}>
      <span
        css={theme.partials.text.caption}
        {...attributes}
      >
        {val || recurse(children)}
      </span>
    </a>
  )
}
