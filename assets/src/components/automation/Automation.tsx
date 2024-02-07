import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { Suspense, useRef } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'
import {
  AUTOMATION_ABS_PATH,
  AUTOMATION_PR_REL_PATH,
  AUTOMATION_SCM_REL_PATH,
} from 'routes/automationRoutesConsts'
import { Directory } from 'components/layout/SideNavEntries'
import { LinkTabWrap } from 'components/utils/Tabs'

const directory = [
  {
    path: AUTOMATION_SCM_REL_PATH,
    label: 'SCM Connection',
  },
  {
    path: AUTOMATION_PR_REL_PATH,
    label: 'PR Automation',
  },
] as const satisfies Directory

export default function PullRequests() {
  const theme = useTheme()

  const cdEnabled = useCDEnabled({ redirect: true })

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${AUTOMATION_ABS_PATH}/:tab*`)
  // @ts-expect-error
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
                to={`${AUTOMATION_ABS_PATH}/${path}`}
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
        </div>
      }
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet />
          </Suspense>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
