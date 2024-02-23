import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  CLUSTER_ABS_PATH,
  CLUSTER_BACKUPS_REL_PATH,
  CLUSTER_RESTORES_REL_PATH,
  getBackupsClusterAbsPath,
} from '../../../routes/backupRoutesConsts'
import { LinkTabWrap } from '../../utils/Tabs'
import { PluralErrorBoundary } from '../../cd/PluralErrorBoundary'
import LoadingIndicator from '../../utils/LoadingIndicator'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../../cd/ContinuousDeployment'

export default function Cluster() {
  const theme = useTheme()
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

  const directory = useMemo(
    () =>
      [
        {
          path: `${getBackupsClusterAbsPath(
            clusterId
          )}/${CLUSTER_BACKUPS_REL_PATH}`,
          label: 'Backups',
        },
        {
          path: `${getBackupsClusterAbsPath(
            clusterId
          )}/${CLUSTER_RESTORES_REL_PATH}`,
          label: 'Restores',
        },
      ] as const,
    [clusterId]
  )

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${CLUSTER_ABS_PATH}/:tab*`)
  // @ts-expect-error
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path.includes(tab))

  return (
    <ResponsivePageFullWidth
      scrollable={scrollable}
      headingContent={
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            flexGrow: 1,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <TabList
            gap="xxsmall"
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ label, path }) => (
              <LinkTabWrap
                subTab
                key={path}
                textValue={label}
                to={path}
              >
                <SubTab
                  key={path}
                  textValue={label}
                >
                  {label}
                </SubTab>
              </LinkTabWrap>
            ))}
          </TabList>
          {headerContent}
        </div>
      }
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <PageHeaderContext.Provider value={pageHeaderContext}>
            <PageScrollableContext.Provider value={pageScrollableContext}>
              <Suspense fallback={<LoadingIndicator />}>
                <Outlet />
              </Suspense>
            </PageScrollableContext.Provider>
          </PageHeaderContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
