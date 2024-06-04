import { Flex } from 'honorable'
import { useContext } from 'react'

import { LoginContext } from 'components/contexts'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { OIDCInvite } from './OIDCInvite'
import UserInvite from './UserInvite'
import UserList from './UsersList'

export default function Users() {
  const { configuration } = useContext(LoginContext)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Users"
      headingContent={
        <Flex
          alignItems="flex-end"
          gap="medium"
        >
          {configuration && !configuration?.pluralLogin && <UserInvite />}
          {configuration?.pluralLogin && <OIDCInvite />}
        </Flex>
      }
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <UserList />
      </div>
    </ScrollablePage>
  )
}
