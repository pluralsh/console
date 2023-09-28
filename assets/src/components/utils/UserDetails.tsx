import { AppIcon } from '@pluralsh/design-system'
import styled from 'styled-components'

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

type UserDetailsProps = {
  name?: string | null
  email?: string | null
  avatar?: string | null
}

// TODO: Export to design system as it is used here and in app pretty often.
export default function UserDetails({ name, email, avatar }: UserDetailsProps) {
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
