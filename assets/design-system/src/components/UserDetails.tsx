import styled from 'styled-components'

import { AppIcon } from '../index'

const UserDetailsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  whiteSpace: 'nowrap',

  '.name': {
    ...theme.partials.text.body2,
  },

  '.email': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    display: 'flex',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}))

export default function UserDetails({
  name,
  email,
  avatar,
}: {
  name?: string | null
  email?: string | null
  avatar?: string | null
}) {
  return (
    <UserDetailsSC>
      <AppIcon
        name={name || ''}
        url={avatar || undefined}
        size="xxsmall"
      />
      <div>
        <div className="name">{name}</div>
        {email && <div className="email">{email}</div>}
      </div>
    </UserDetailsSC>
  )
}
