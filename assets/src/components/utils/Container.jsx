import { useContext } from 'react'
import { Box, ThemeContext } from 'grommet'

import { normalizeColor } from 'grommet/utils'

import { alpha } from '../../utils/color'

export const boxShadow = (theme) => ({
  boxShadow: `2px 2px 2px ${alpha(
    normalizeColor('backgroundDark', theme),
    0.3
  )}`,
})

export function Container({ onClick, gap, children, ...rest }) {
  const theme = useContext(ThemeContext)

  return (
    <Box
      style={boxShadow(theme)}
      pad="small"
      direction="row"
      round="3px"
      background="card"
      align="center"
      focusIndicator={false}
      hoverIndicator="cardHover"
      onClick={onClick}
      gap={gap || 'small'}
      {...rest}
    >
      {children}
    </Box>
  )
}
