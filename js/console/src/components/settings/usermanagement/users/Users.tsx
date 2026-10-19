import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { SettingsDescription } from 'components/settings/Settings'
import { getUserManagementBreadcrumbs } from '../UserManagement'
import UserInvite from './UserInvite'
import { UsersList } from './UsersList'

const breadcrumbs = getUserManagementBreadcrumbs('users')

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      <SettingsDescription>
        See users in your org. Change them to admin here.
      </SettingsDescription>
      <UsersList />
      {!configuration?.pluralLogin && !configuration?.externalOidc && (
        <PageToolbarPortal>
          <UserInvite small />
        </PageToolbarPortal>
      )}
    </>
  )
}
