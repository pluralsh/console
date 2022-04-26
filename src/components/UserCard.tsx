import { Div, P } from 'honorable'
import PropTypes from 'prop-types'

import { UserType } from '../types'

import Avatar from './Avatar'

type UserCardProps = typeof Div & {
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
    <Div
      xflex="x4"
      {...props}
    >
      <Avatar
        name={user.name}
        imageUrl={user.imageUrl}
      />
      <Div pl={0.5}>
        <P
          truncate
          fontWeight="bold"
          color="text-strong"
        >
          {user.name}
        </P>
        <P
          truncate
          size="small"
          color="text-xweak"
        >
          {user.email}
        </P>
      </Div>
    </Div>
  )
}

UserCard.propTypes = propTypes

export default UserCard
