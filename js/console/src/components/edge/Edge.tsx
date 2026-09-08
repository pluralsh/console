import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { EDGE_ABS_PATH, EDGE_BASE_CRUMBS } from '../../routes/edgeRoutes.tsx'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { LinkTabWrap } from '../utils/Tabs.tsx'
import { PageHeaderContext } from './context.tsx'
import { useCurrentTab, useDirectory } from './hooks.ts'

export default function Edge(): ReactNode {
  const theme = useTheme()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const directory = useDirectory()
  const tabStateRef = useRef<any>(null)
  const tab = useCurrentTab()

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const currentTab = directory.find(({ path }) => path === tab)

  useSetBreadcrumbs(EDGE_BASE_CRUMBS)

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      maxContentWidth={1440}
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
            scrollable
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ label, path }) => (
              <LinkTabWrap
                css={{
                  minWidth: 'fit-content',
                }}
                subTab
                key={path}
                textValue={label}
                to={`${EDGE_ABS_PATH}/${path}`}
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
            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </PageHeaderContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
