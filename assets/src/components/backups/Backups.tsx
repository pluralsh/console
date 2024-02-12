import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { Outlet, useMatch } from 'react-router-dom'

import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_REL_PATH,
  OBJECT_STORES_REL_PATH,
} from '../../routes/backupRoutesConsts'
import { LinkTabWrap } from '../utils/Tabs'
import { PluralErrorBoundary } from '../cd/PluralErrorBoundary'
import LoadingIndicator from '../utils/LoadingIndicator'
import {
  PageHeaderContext,
  PageScrollableContext,
} from '../cd/ContinuousDeployment'

const directory = [
  { path: OBJECT_STORES_REL_PATH, label: 'Object Store Credentials' },
  { path: BACKUPS_REL_PATH, label: 'Backups' },
] as const

export default function Backups() {
  const theme = useTheme()
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

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${BACKUPS_ABS_PATH}/:tab*`)
  // @ts-expect-error
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

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
                to={`${BACKUPS_ABS_PATH}/${path}`}
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
