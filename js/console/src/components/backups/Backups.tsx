import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet, useMatch } from 'react-router-dom'

import { ReactNode, Suspense, useMemo, useState } from 'react'

import {
  BACKUPS_ABS_PATH,
  CLUSTERS_REL_PATH,
  OBJECT_STORES_REL_PATH,
} from '../../routes/backupRoutesConsts'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary'
import LoadingIndicator from '../utils/LoadingIndicator'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../cd/ContinuousDeployment'

const tabs = [
  { path: OBJECT_STORES_REL_PATH, label: 'Object Store Credentials' },
  { path: CLUSTERS_REL_PATH, label: 'Clusters' },
].map(({ path, label }) => ({ label, path: `${BACKUPS_ABS_PATH}/${path}` }))

export default function Backups() {
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [scrollable, setScrollable] = useState(false)

  const pageScrollableContext = useMemo(
    () => ({
      setScrollable,
    }),
    []
  )
  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const pathMatch = useMatch(`${BACKUPS_ABS_PATH}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) => path === `${BACKUPS_ABS_PATH}/${tab}`}
      >
        {headerContent}
      </PageToolbar>
      <ResponsivePageFullWidth scrollable={scrollable}>
        <PluralErrorBoundary>
          <PageHeaderContext.Provider value={pageHeaderContext}>
            <PageScrollableContext.Provider value={pageScrollableContext}>
              <Suspense fallback={<LoadingIndicator />}>
                <Outlet />
              </Suspense>
            </PageScrollableContext.Provider>
          </PageHeaderContext.Provider>
        </PluralErrorBoundary>
      </ResponsivePageFullWidth>
    </PageColumnSC>
  )
}
