import { Box, BoxExtendedProps, Text } from 'grommet'
import PropTypes from 'prop-types'

import { UserType } from '../types'

import Avatar from './Avatar'

type UserCardProps = BoxExtendedProps & {
  user?: UserType
}

const propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    imageUrl: PropTypes.string,
  }),
}

function UserCard({ user = {}, ...props }: UserCardProps) {
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

UserCard.propTypes = propTypes

export default UserCard
