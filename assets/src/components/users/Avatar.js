import React from 'react'
import { Box, Text } from 'grommet'

export function initials(name) {
  return name
          .split(' ')
          .map((n) => n.charAt(0).toUpperCase())
          .join('')
}

export default function Avatar({size, user: {backgroundColor, avatar, name}, onClick}) {
  return (
    <Box
      flex={false}
      focusIndicator={false}
      round='xsmall'
      align='center'
      justify='center'
      width={size}
      height={size}
      onClick={onClick}
      background={backgroundColor}>
      {avatar ?
        <img alt='my avatar' height={size} width={size} style={{borderRadius: '6px'}} src={avatar}/> :
        <Text size='small'>{initials(name)}</Text>
      }
    </Box>
  )
}