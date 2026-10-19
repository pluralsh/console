import { Breadcrumb } from '@pluralsh/design-system'
import { Outlet } from 'react-router-dom'
import { AUDITS_ABS_PATH } from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsToolbarTabs } from '../Settings'

const DIRECTORY = [
  { path: `${AUDITS_ABS_PATH}/list`, label: 'List view' },
  { path: `${AUDITS_ABS_PATH}/map`, label: 'Map view' },
]

export const AUDITS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'audit-logs', url: AUDITS_ABS_PATH },
]

export default function Audits() {
  return (
    <>
      <SettingsToolbarTabs directory={DIRECTORY} />
      <Outlet />
    </>
  )
}
