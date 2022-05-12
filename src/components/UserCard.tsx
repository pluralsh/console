import { Ref, forwardRef } from 'react'
import { Div, Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'

import { UserType } from '../types'

import Avatar from './Avatar'

type UserCardProps = FlexProps & {
  user?: UserType
}

const propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    imageUrl: PropTypes.string,
  }),
}

function UserCardRef({ user = {}, ...props }: UserCardProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      align="center"
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
          body2
          mt={0.25}
          color="text-xlight"
        >
          {user.email}
        </P>
      </Div>
    </Flex>
  )
}

const UserCard = forwardRef(UserCardRef)

UserCard.propTypes = propTypes

export default UserCard
