import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { ReactNode, Suspense, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { EDGE_ABS_PATH, EDGE_BASE_CRUMBS } from '../../routes/edgeRoutes.tsx'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { PageHeaderContext } from './context.tsx'
import { useCurrentTab, useDirectory } from './hooks.ts'

export default function Edge(): ReactNode {
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const directory = useDirectory()
  const tab = useCurrentTab()

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const tabs = useMemo(
    () =>
      directory.map(({ label, path }) => ({
        label,
        path: `${EDGE_ABS_PATH}/${path}`,
      })),
    [directory]
  )

  useSetBreadcrumbs(EDGE_BASE_CRUMBS)

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) => path === `${EDGE_ABS_PATH}/${tab}`}
      >
        {headerContent}
      </PageToolbar>
      <ResponsivePageFullWidth
        scrollable={false}
        maxContentWidth={1440}
      >
        <PluralErrorBoundary>
          <PageHeaderContext.Provider value={pageHeaderContext}>
            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </PageHeaderContext.Provider>
        </PluralErrorBoundary>
      </ResponsivePageFullWidth>
    </PageColumnSC>
  )
}
