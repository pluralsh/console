import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import {
  ReactNode,
  Suspense,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'
import { MakeInert } from 'components/utils/MakeInert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  PR_ABS_PATH,
  PR_DEFAULT_REL_PATH,
  PR_DEPENDENCIES_REL_PATH,
  PR_OUTSTANDING_REL_PATH,
} from 'routes/prRoutesConsts'

import { Directory } from 'components/layout/SideNavEntries'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { PluralErrorBoundary } from 'components/cd/PluralErrorBoundary'

export const POLL_INTERVAL = 10_000

const CDContext = createContext<
  | {
      setScrollable: (content: boolean) => void
      setHeaderContent: (content: ReactNode) => void
    }
  | undefined
>(undefined)

export const useSetCDScrollable = (scrollable: boolean) => {
  const ctx = useContext(CDContext)

  if (!ctx) {
    console.warn('useSetCDScrollable() must be used within a CDContext')
  }
  const { setScrollable } = ctx || {}

  useLayoutEffect(() => {
    setScrollable?.(scrollable)

    return () => {
      setScrollable?.(false)
    }
  }, [scrollable, setScrollable])
}

const directory = [
  {
    path: PR_OUTSTANDING_REL_PATH,
    label: 'Outstanding PRs',
  },
  {
    path: PR_DEPENDENCIES_REL_PATH,
    label: 'Dependency dashboard',
  },
] as const satisfies Directory

export default function PullRequests() {
  const theme = useTheme()
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [scrollable, setScrollable] = useState(false)

  const cdContext = useMemo(
    () => ({
      setHeaderContent,
      setScrollable,
    }),
    []
  )

  const cdEnabled = useCDEnabled()

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${PR_ABS_PATH}/:tab*`)
  // @ts-expect-error
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  return (
    <ResponsivePageFullWidth
      scrollable={scrollable}
      headingContent={
        <MakeInert inert={!cdEnabled}>
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
                  to={`${PR_ABS_PATH}/${path}`}
                >
                  <SubTab
                    key={path}
                    textValue={label}
                    disabled={!cdEnabled && path !== PR_DEFAULT_REL_PATH}
                  >
                    {label}
                  </SubTab>
                </LinkTabWrap>
              ))}
            </TabList>
            {headerContent}
          </div>
        </MakeInert>
      }
    >
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <CDContext.Provider value={cdContext}>
            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </CDContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
