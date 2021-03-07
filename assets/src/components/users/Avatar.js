import React from 'react'
import { Box, Text } from 'grommet'

export function initials(name) {
  return name
          .split(' ')
          .map((n) => n.charAt(0).toUpperCase())
          .join('')
}

export default function Avatar({size, user: {backgroundColor, avatar, name}, onClick, round}) {
  return (
    <Box
      flex={false}
      round={round || 'xsmall'}
      style={avatar ? {backgroundImage: `url(${avatar})`, backgroundPosition: 'center', backgroundSize: 'cover'} : null}
      align='center'
      justify='center'
      width={size}
      height={size}
      onClick={onClick}
      background={!avatar ? backgroundColor : null}>
      {!avatar && <Text>{initials(name)}</Text>}
    </Box>
  )
}