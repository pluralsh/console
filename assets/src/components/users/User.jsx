import { Box, Text } from 'grommet'

import Avatar from './Avatar'

export function UserRow({ user, next }) {
  return (
    <Box
      pad="small"
      direction="row"
      align="center"
      gap="small"
      border={next ? { side: 'bottom', color: 'tone-medium' } : null}
    >
      <Avatar
        user={user}
        size="50px"
      />
      <Box>
        <Text
          size="small"
          weight="bold"
        >{user.email}
        </Text>
        <Text size="small">{user.name}</Text>
      </Box>
    </Box>
  )
}
