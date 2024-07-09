import { Flex } from 'honorable'
import { useMemo } from 'react'

import { useLogin } from 'components/contexts'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { BREADCRUMBS } from '../UserManagement'

import { OIDCInvite } from './OIDCInvite'
import UserInvite from './UserInvite'
import UserList from './UsersList'

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(
    useMemo(
      () => [...BREADCRUMBS, { label: 'users', url: '/account/users' }],
      []
    )
  )

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
