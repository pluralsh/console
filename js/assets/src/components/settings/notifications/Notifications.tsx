import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  NOTIFICATIONS_ABS_PATH,
  NOTIFICATIONS_ROUTERS_REL_PATH,
  NOTIFICATIONS_SINKS_REL_PATH,
} from 'routes/settingsRoutesConst'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { Directory } from 'components/layout/SideNavEntries'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { LinkTabWrap } from 'components/utils/Tabs'
import {
  PageHeaderContext,
  useSetPageHeaderContent,
} from 'components/cd/ContinuousDeployment'

const directory = [
  {
    path: NOTIFICATIONS_ROUTERS_REL_PATH,
    label: 'Routers',
  },
  {
    path: NOTIFICATIONS_SINKS_REL_PATH,
    label: 'Sinks',
  },
] as const satisfies Directory

export default function Notifications() {
  const theme = useTheme()
  const [headerContent, setHeaderContent] = useState<ReactNode>()

  const pageHeaderContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )

  const cdEnabled = useCDEnabled({ redirect: true })

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${NOTIFICATIONS_ABS_PATH}/:tab*`)
  // @ts-ignore
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  useSetPageHeaderContent(
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
            to={`${NOTIFICATIONS_ABS_PATH}/${path}`}
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
  )

  if (!cdEnabled) return null

  return (
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
  )
}
