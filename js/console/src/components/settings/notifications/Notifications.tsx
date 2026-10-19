import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import {
  NOTIFICATIONS_ABS_PATH,
  NOTIFICATIONS_ROUTERS_REL_PATH,
  NOTIFICATIONS_SINKS_REL_PATH,
} from 'routes/settingsRoutesConst'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { SettingsToolbarTabs } from '../Settings'

const directory = [
  {
    path: `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_ROUTERS_REL_PATH}`,
    label: 'Routers',
  },
  {
    path: `${NOTIFICATIONS_ABS_PATH}/${NOTIFICATIONS_SINKS_REL_PATH}`,
    label: 'Sinks',
  },
]

export default function Notifications() {
  const cdEnabled = useCDEnabled({ redirect: true })

  return (
    <>
      <SettingsToolbarTabs directory={directory} />
      {cdEnabled && (
        <PluralErrorBoundary>
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet />
          </Suspense>
        </PluralErrorBoundary>
      )}
    </>
  )
}
