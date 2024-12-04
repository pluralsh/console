import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  PR_ABS_PATH,
  PR_AUTOMATIONS_REL_PATH,
  PR_QUEUE_REL_PATH,
  PR_SCM_REL_PATH,
  PR_SCM_WEBHOOKS_REL_PATH,
} from 'routes/prRoutesConsts'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { Directory } from 'components/layout/SideNavEntries'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { LinkTabWrap } from 'components/utils/Tabs'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'

const directory = [
  {
    path: PR_QUEUE_REL_PATH,
    label: 'Outstanding PRs',
  },
  // {
  //   path: PR_DEPENDENCIES_REL_PATH,
  //   label: 'Dependency dashboard',
  // },
  {
    path: PR_SCM_REL_PATH,
    label: 'SCM Connections',
  },
  {
    path: PR_SCM_WEBHOOKS_REL_PATH,
    label: 'SCM Webhooks',
  },
  {
    path: PR_AUTOMATIONS_REL_PATH,
    label: 'PR Automations',
  },
] as const satisfies Directory

export default function Pr() {
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
  const pathMatch = useMatch(`${PR_ABS_PATH}/:tab/*`)
  // @ts-ignore
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  if (!cdEnabled) return null

  return (
    <ResponsivePageFullWidth
      scrollable={false}
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
                subTab
                key={path}
                textValue={label}
                to={`${PR_ABS_PATH}/${path}`}
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
          <div css={{ minWidth: 'fit-content' }}>{headerContent}</div>
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
