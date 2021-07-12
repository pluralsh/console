import React from 'react'
import { Box, Text } from 'grommet'

export function initials(name) {
  return name
          .split(' ')
          .map((n) => n.charAt(0).toUpperCase())
          .join('')
}

export default function Avatar({size, user: {backgroundColor, profile, name}, onClick, round}) {
  return (
    <Box
      flex={false}
      round={round || 'xsmall'}
      style={profile ? {backgroundImage: `url(${profile})`, backgroundPosition: 'center', backgroundSize: 'cover'} : null}
      align='center'
      justify='center'
      width={size}
      height={size}
      onClick={onClick}
      background={!profile ? backgroundColor : null}>
      {!profile && <Text size='small'>{initials(name)}</Text>}
    </Box>
  )
}