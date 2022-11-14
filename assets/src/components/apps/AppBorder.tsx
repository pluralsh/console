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
      height="100%"
      width="3px"
    />
  )
}
