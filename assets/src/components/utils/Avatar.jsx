import { Box, Text } from 'grommet'
import { last } from 'lodash'

export function initials(name) {
  const initials = name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())

  if (initials.length <= 1) return initials[0]

  return `${initials[0]}${last(initials)}`
}

export default function Avatar({
  size, user: {
    backgroundColor, avatar, profile, name,
  }, onClick = undefined, round = '3px',
}) {
  const icon = profile || avatar

  return (
    <Box
      flex={false}
      round={round}
      style={icon ? { backgroundImage: `url(${icon})`, backgroundPosition: 'center', backgroundSize: 'cover' } : null}
      align="center"
      justify="center"
      width={size}
      height={size}
      onClick={onClick}
      background={!icon ? backgroundColor : null}
    >
      {!icon && <Text size="small">{initials(name)}</Text>}
    </Box>
  )
}
