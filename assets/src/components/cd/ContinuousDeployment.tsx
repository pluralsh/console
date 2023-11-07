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

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Outlet, useMatch } from 'react-router-dom'
import { LinkTabWrap } from 'components/utils/Tabs'
import {
  ADDONS_PATH,
  CD_BASE_PATH,
  CLUSTERS_PATH,
  SERVICES_PATH,
} from 'routes/cdRoutesConsts'
import LoadingIndicator from 'components/utils/LoadingIndicator'

export const POLL_INTERVAL = 10_000

const CDContext = createContext<
  | {
      setHeaderContent: (content: ReactNode) => void
    }
  | undefined
>(undefined)

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
  { label: 'cd', url: '/cd' },
] as const satisfies readonly Breadcrumb[]

const directory = [
  { path: CLUSTERS_PATH, label: 'Clusters' },
  { path: SERVICES_PATH, label: 'Services' },
  { path: 'git', label: 'Git repositories' },
  { path: 'providers', label: 'Providers' },
  { path: ADDONS_PATH, label: 'Add-ons' },
] as const

export default function ContinuousDeployment() {
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const cdContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`/${CD_BASE_PATH}/:tab*`)
  // @ts-expect-error
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      headingContent={
        <>
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
                to={`/${CD_BASE_PATH}/${path}`}
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
        </>
      }
    >
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
    </ResponsivePageFullWidth>
  )
}
