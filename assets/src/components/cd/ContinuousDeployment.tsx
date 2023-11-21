import { Breadcrumb, SubTab, TabList, TabPanel } from '@pluralsh/design-system'
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

import {
  ADDONS_REL_PATH,
  CD_ABS_PATH,
  CD_DEFAULT_REL_PATH,
  CLUSTERS_REL_PATH,
  PIPELINES_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'
import { MakeInert } from 'components/utils/MakeInert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useCDEnabled } from './utils/useCDEnabled'
import { PluralErrorBoundary } from './PluralErrorBoundary'

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

export const useSetCDHeaderContent = (headerContent?: ReactNode) => {
  const ctx = useContext(CDContext)

  if (!ctx) {
    console.warn('useSetCDHeaderContent() must be used within a CDContext')
  }
  const { setHeaderContent } = ctx || {}

  useLayoutEffect(() => {
    setHeaderContent?.(headerContent)

    return () => {
      setHeaderContent?.(null)
    }
  }, [setHeaderContent, headerContent])
}

export const CD_BASE_CRUMBS = [
  { label: 'cd', url: `${CD_ABS_PATH}/${CD_DEFAULT_REL_PATH}` },
] as const satisfies readonly Breadcrumb[]

const directory = [
  { path: CLUSTERS_REL_PATH, label: 'Clusters' },
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: 'git', label: 'Git repositories' },
  { path: 'providers', label: 'Providers' },
  { path: ADDONS_REL_PATH, label: 'Add-ons' },
  { path: PIPELINES_REL_PATH, label: 'Pipelines' },
] as const

export default function ContinuousDeployment() {
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
  const pathMatch = useMatch(`${CD_ABS_PATH}/:tab*`)
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
                  to={!cdEnabled ? '' : `${CD_ABS_PATH}/${path}`}
                >
                  <SubTab
                    key={path}
                    textValue={label}
                    disabled={!cdEnabled && path !== CD_DEFAULT_REL_PATH}
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
