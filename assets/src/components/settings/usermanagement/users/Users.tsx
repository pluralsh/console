import { useLogin } from 'components/contexts'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { SettingsPageHeader } from 'components/settings/Settings'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import { OIDCInvite } from './OIDCInvite'
import UserInvite from './UserInvite'
import UsersList from './UsersList'

const breadcrumbs = getUserManagementBreadcrumbs('users')

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      <SettingsPageHeader heading="Users">
        {configuration?.pluralLogin ? (
          <OIDCInvite />
        ) : (
          !configuration?.externalOidc && <UserInvite />
        )}
      </SettingsPageHeader>

      <UsersList />
    </>
  )
}
