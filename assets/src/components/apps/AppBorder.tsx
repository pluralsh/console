import { Flex } from 'honorable'

import { getBorderColor } from './misc'

export default function AppBorder({ app }) {
  const borderColor = getBorderColor(app)

  if (!borderColor) return null

  return (
    <Flex
      backgroundColor={borderColor}
      borderTopLeftRadius={4}
      borderBottomLeftRadius={4}
      display="inline-flex"
      height="100%"
      width="3px"
    />
  )
}
