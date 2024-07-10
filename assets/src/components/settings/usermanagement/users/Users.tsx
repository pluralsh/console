import { useLogin } from 'components/contexts'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { SettingsPageHeader } from 'components/settings/Settings'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import { OIDCInvite } from './OIDCInvite'
import UserInvite from './UserInvite'
import UserList from './UsersList'

const breadcrumbs = getUserManagementBreadcrumbs('users')

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      <SettingsPageHeader heading="Users">
        {configuration && !configuration?.pluralLogin && <UserInvite />}
        {configuration?.pluralLogin && <OIDCInvite />}
      </SettingsPageHeader>

      <UserList />
    </>
  )
}
