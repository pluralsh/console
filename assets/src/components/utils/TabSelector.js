import { Box, Text } from 'grommet'
import React, { useState } from 'react'

export function TabHeader({ text, selected, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <Box
      pad={{ vertical: 'xsmall', horizontal: 'small' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      border={selected ? { side: 'bottom', color: 'brand', size: '2px' } : (hover ? { side: 'bottom', color: 'dark-6', size: '2px' } : null)}
      onClick={onClick}
      focusIndicator={false}
    >
      <Text
        size="small"
        weight={500}
        color={selected || hover ? null : 'dark-3'}
      >{text}
      </Text>
    </Box>
  )
}

export function TabSelector({ enabled, children, gap, pad, hoverIndicator, onClick }) {
  const [hover, setHover] = useState(false)
  const border = (hover || enabled) ? { side: 'right', color: 'brand', size: '2px' } : null

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      pad={pad || { horizontal: 'small', vertical: 'xxsmall' }}
      hoverIndicator={hoverIndicator || 'light-2'}
      focusIndicator={false}
      direction="row"
      align="center"
      gap={gap || 'xsmall'}
      border={border}
      onClick={onClick}
    >
      {children}
    </Box>
  )
}
