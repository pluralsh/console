import { Div } from 'honorable'

import { getBorderColor } from './misc'

export default function AppBorder({ app }) {
  const borderColor = getBorderColor(app)

  if (!borderColor) return null

  return (
    <Div
      backgroundColor={borderColor}
      borderTopLeftRadius={4}
      borderBottomLeftRadius={4}
      height="100%"
      width={3}
    />
  )
}
