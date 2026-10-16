import { Outlet } from 'react-router-dom'

import { useLogin } from 'components/contexts'
import { USER_MANAGEMENT_ABS_PATH } from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsToolbarTabs } from '../Settings'

const directory = [
  { path: 'users', label: 'Users' },
  { path: 'groups', label: 'Groups' },
  { path: 'service-accounts', label: 'Service Accounts' },
  { path: 'personas', label: 'Personas' },
].map(({ path, label }) => ({
  label,
  path: `${USER_MANAGEMENT_ABS_PATH}/${path}`,
}))

export const getUserManagementBreadcrumbs = (page: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'user-management', url: USER_MANAGEMENT_ABS_PATH },
  { label: page, url: `${USER_MANAGEMENT_ABS_PATH}/${page}` },
]

export default function UserManagement() {
  const { me } = useLogin()

  return (
    <>
      <SettingsToolbarTabs directory={directory} />
      {me && <Outlet />}
    </>
  )
}
