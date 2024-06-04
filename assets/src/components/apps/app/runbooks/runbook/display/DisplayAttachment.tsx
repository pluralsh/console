import { normalizeColor } from 'grommet/utils'

import { recurse } from './misc'

export function DisplayAttachment({ children, attributes, theme }) {
  const { accent, margin, ...rest } = attributes || {}

  return (
    <div
      css={{
        margin,
        border: '1px solid border',
        backgroundColor: 'white',
      }}
    >
      <div
        css={{
          borderLeft: `2px solid ${
            accent ? normalizeColor(accent, theme) : 'rgba(35, 137, 215, 0.5)'
          }`,
        }}
        {...rest}
      >
        {recurse(children)}
      </div>
    </div>
  )
}
