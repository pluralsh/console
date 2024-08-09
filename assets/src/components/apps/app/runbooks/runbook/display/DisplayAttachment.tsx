import { Div } from 'honorable'

import { recurse } from './misc'

export function DisplayAttachment({ children, attributes, theme }) {
  const { accent, margin, ...rest } = attributes || {}

  return (
    <Div
      margin={margin}
      border="1px solid border"
      backgroundColor="white"
    >
      <Div
        borderLeft={`2px solid ${
          accent ? theme.colors[accent] : 'rgba(35, 137, 215, 0.5)'
        }`}
        {...rest}
      >
        {recurse(children)}
      </Div>
    </Div>
  )
}
