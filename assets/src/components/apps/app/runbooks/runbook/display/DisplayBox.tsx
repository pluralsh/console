import { Box } from 'grommet'

import { recurse } from './misc'

const border = ({ borderSize, borderSide, border }) => (
  (borderSize || borderSide) ? { side: borderSide, color: border, size: borderSize } : border
)

export function DisplayBox({ children, attributes }) {
  return (
    <Box
      {...(attributes || {})}
      border={border(attributes)}
    >
      {recurse(children)}
    </Box>
  )
}
