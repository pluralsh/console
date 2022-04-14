import { Box, Text } from 'grommet'

import Avatar from './Avatar'

export default function UserCard({ user = {}, ...props }) {

  return (
    <Box
      direction="row"
      align="center"
      {...props}
    >
      <Avatar
        name={user.name}
        imageUrl={user.imageUrl}
      />
      <Box pad={{ left: '8px' }}>
        <Text
          truncate
          weight="bold"
          size="small"
          color="text-strong"
        >
          {user.name}
        </Text>
        <Text
          truncate
          size="xsmall"
          color="text-xweak"
        >
          {user.email}
        </Text>
      </Box>
    </Box>
  )
}
