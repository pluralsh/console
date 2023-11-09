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

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { LinkTabWrap } from 'components/utils/Tabs'
import {
  ADDONS_REL_PATH,
  CD_DEFAULT_REL_PATH,
  CD_REL_PATH,
  CLUSTERS_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import BillingFeatureBlockModal from 'components/billing/BillingFeatureBlockModal'

import { useCDEnabled } from './utils/useCDEnabled'
import { PluralErrorBoundary } from './PluralErrorBoundary'

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
  { label: 'cd', url: `/${CD_REL_PATH}/${CD_DEFAULT_REL_PATH}` },
] as const satisfies readonly Breadcrumb[]

const directory = [
  { path: CLUSTERS_REL_PATH, label: 'Clusters' },
  { path: SERVICES_REL_PATH, label: 'Services' },
  { path: 'git', label: 'Git repositories' },
  { path: 'providers', label: 'Providers' },
  { path: ADDONS_REL_PATH, label: 'Add-ons' },
] as const

export default function ContinuousDeployment() {
  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const [showUpgrade, setShowUpgrade] = useState(true)

  const cdContext = useMemo(
    () => ({
      setHeaderContent,
    }),
    []
  )
  // TODO: Figure out proper feature flag
  const cdIsEnabled = useCDEnabled()

  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`/${CD_REL_PATH}/:tab*`)
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
                to={!cdIsEnabled ? '#' : `/${CD_REL_PATH}/${path}`}
              >
                <SubTab
                  key={path}
                  textValue={label}
                  disabled={!cdIsEnabled && path !== CD_DEFAULT_REL_PATH}
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
      <PluralErrorBoundary>
        <TabPanel
          css={{ height: '100%' }}
          stateRef={tabStateRef}
        >
          <CDContext.Provider value={cdContext}>
            {!cdIsEnabled && (
              <BillingFeatureBlockModal
                open={showUpgrade}
                message="Upgrade to Plural Professional to use Continuous Deployment features."
                onClose={() => {
                  setShowUpgrade(false)
                }}
              />
            )}

            <Suspense fallback={<LoadingIndicator />}>
              <Outlet />
            </Suspense>
          </CDContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
