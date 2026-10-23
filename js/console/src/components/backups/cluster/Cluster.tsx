import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { ReactNode, Suspense, useMemo, useState } from 'react'

import {
  CLUSTER_ABS_PATH,
  CLUSTER_BACKUPS_REL_PATH,
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../routes/backupRoutesConsts'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import LoadingIndicator from '../../utils/LoadingIndicator'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../../cd/ContinuousDeployment'

export default function Cluster() {
  const { clusterId = '' } = useParams()
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

  const tabs = useMemo(
    () => [
      {
        path: `${getBackupsClusterAbsPath(clusterId)}/${CLUSTER_BACKUPS_REL_PATH}`,
        label: 'Backups',
      },
      {
        path: `${getBackupsClusterAbsPath(clusterId)}/${CLUSTER_RESTORES_REL_PATH}`,
        label: 'Restores',
      },
    ],
    [clusterId]
  )

  const pathMatch = useMatch(`${CLUSTER_ABS_PATH}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) =>
          path === `${getBackupsClusterAbsPath(clusterId)}/${tab}`
        }
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
