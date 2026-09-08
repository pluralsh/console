import { Breadcrumb, SubTab, TabList } from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AUDITS_ABS_PATH } from 'routes/settingsRoutesConst'

import { SETTINGS_BREADCRUMBS, SettingsPageHeader } from '../Settings'

const DIRECTORY = [
  { path: 'list', label: 'List view' },
  { path: 'map', label: 'Map view' },
]

export const AUDITS_BREADCRUMBS: Breadcrumb[] = [
  ...SETTINGS_BREADCRUMBS,
  { label: 'audit-logs', url: AUDITS_ABS_PATH },
]

export default function Audits() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentView =
    DIRECTORY.find((tab) =>
      pathname?.startsWith(`${AUDITS_ABS_PATH}/${tab.path}`)
    )?.path || DIRECTORY[0].path

  useSetPageHeaderContent(
    <SettingsPageHeader heading="Audits">
      <TabList
        margin={1}
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: currentView,
          onSelectionChange: (view) => {
            navigate(view as string)
          },
        }}
      >
        {DIRECTORY.map(({ path, label }) => (
          <SubTab
            key={path}
            textValue={label}
          >
            {label}
          </SubTab>
        ))}
      </TabList>
    </SettingsPageHeader>
  )

  return <Outlet />
}
