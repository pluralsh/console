import { Breadcrumb, SubTab, TabList, TabPanel } from '@pluralsh/design-system'

import { useLogin } from 'components/contexts'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { MakeInert } from 'components/utils/MakeInert'
import { LinkTabWrap } from 'components/utils/Tabs'
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Outlet, useMatch } from 'react-router-dom'

import {
  CD_ABS_PATH,
  CD_DEFAULT_ABS_PATH,
  CD_DEFAULT_REL_PATH,
  CLUSTERS_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  NAMESPACES_REL_PATH,
  OBSERVERS_REL_PATH,
  PIPELINES_REL_PATH,
  REPOS_REL_PATH,
  SERVICES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'
import { PluralErrorBoundary } from './PluralErrorBoundary'

import { useCDEnabled } from './utils/useCDEnabled'

export const POLL_INTERVAL = 10_000

export const PageScrollableContext = createContext<
  | {
      setScrollable: (content: boolean) => void
    }
  | undefined
>(undefined)

export const useSetPageScrollable = (scrollable: boolean) => {
  const ctx = useContext(PageScrollableContext)

  if (!ctx) {
    console.warn(
      'useSetPageScrollable() must be used within a PageScrollableContext'
    )
  }
  const { setScrollable } = ctx || {}

  useLayoutEffect(() => {
    setScrollable?.(scrollable)

    return () => {
      setScrollable?.(false)
    }
  }, [scrollable, setScrollable])
}

export interface MoreMenuItem {
  key: string
  icon: ReactNode
  label: string
  enabled: boolean | (() => boolean)
}

export interface HeaderContext {
  setHeaderContent: Dispatch<SetStateAction<ReactNode>>
  setHeaderAction?: Dispatch<SetStateAction<ReactNode>>
  setMoreMenuItems?: Dispatch<Array<MoreMenuItem>>
  menuKey?: string
  setMenuKey?: Dispatch<string>
}

export const PageHeaderContext = createContext<HeaderContext | undefined>(
  undefined
)

export const usePageHeaderContext = (): HeaderContext => {
  const ctx = useContext(PageHeaderContext)

  if (!ctx) {
    throw new Error(
      'usePageHeaderContext() must be used within PageHeaderContext'
    )
  }

  return ctx
}

export const useSetPageHeaderContent = (headerContent?: ReactNode) => {
  const ctx = useContext(PageHeaderContext)

  if (!ctx) {
    console.warn(
      'useSetPageHeaderContent() must be used within a PageHeaderContext'
    )
  }
  const { setHeaderContent } = ctx || {}

  useLayoutEffect(() => {
    setHeaderContent?.(headerContent)

    return () => {
      setHeaderContent?.(null)
    }
  }, [setHeaderContent, headerContent])
}

export const useSetPageHeaderAction = (action?: ReactNode) => {
  const ctx = useContext(PageHeaderContext)

  if (!ctx) {
    console.warn(
      'useSetPageHeaderAction() must be used within a PageHeaderContext'
    )
  }
  const { setHeaderAction } = ctx || {}

  useLayoutEffect(() => {
    setHeaderAction?.(action)

    return () => {
      setHeaderAction?.(null)
    }
  }, [setHeaderAction, action])
}

export const CD_BASE_CRUMBS = [
  { label: 'cd', url: CD_ABS_PATH },
] as const satisfies readonly Breadcrumb[]

function useCurrentTab() {
  const pathMatch = useMatch(`${CD_ABS_PATH}/:tab/*`)

  return pathMatch?.params?.tab || ''
}

export function useDefaultCDPath() {
  const cdEnabled = useCDEnabled()
  const directory = useDirectory({ filtered: false })

  return useMemo(() => {
    const firstEnabledPath = directory.find(({ enabled }) => enabled)?.path

    return !cdEnabled || !firstEnabledPath
      ? CD_DEFAULT_ABS_PATH
      : `${CD_ABS_PATH}/${firstEnabledPath}`
  }, [cdEnabled, directory])
}

function useDirectory({ filtered = true }: { filtered?: boolean } = {}) {
  const { personaConfiguration } = useLogin()
  const config = personaConfiguration?.deployments
  const currentRelPath = useCurrentTab()

  return useMemo(() => {
    const directory = [
      {
        path: CLUSTERS_REL_PATH,
        label: 'Clusters',
        enabled: personaConfiguration?.all || config?.clusters,
      },
      {
        path: SERVICES_REL_PATH,
        label: 'Services',
        enabled: personaConfiguration?.all || config?.services,
      },
      {
        path: GLOBAL_SERVICES_REL_PATH,
        label: 'Global Services',
        enabled: personaConfiguration?.all || config?.services,
      },
      {
        path: REPOS_REL_PATH,
        label: 'Repositories',
        enabled: personaConfiguration?.all || config?.repositories,
      },
      {
        path: PIPELINES_REL_PATH,
        label: 'Pipelines',
        enabled: personaConfiguration?.all || config?.pipelines,
      },
      {
        path: NAMESPACES_REL_PATH,
        label: 'Namespaces',
        enabled: personaConfiguration?.all || config?.services,
      },
      {
        path: OBSERVERS_REL_PATH,
        label: 'Observers',
        enabled: true,
      },
    ]

    if (!filtered) {
      return directory
    }

    return directory.filter(
      ({ enabled, path }) => enabled || currentRelPath === path
    )
  }, [config, personaConfiguration?.all, currentRelPath, filtered])
}

export default function ContinuousDeployment() {
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
    () =>
      ({
        setHeaderContent,
      }) as HeaderContext,
    []
  )

  const cdEnabled = useCDEnabled()
  const directory = useDirectory({ filtered: true })

  const tabStateRef = useRef<any>(null)
  const tab = useCurrentTab()
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
            <div
              css={{
                flexShrink: 0,
              }}
            >
              {headerContent}
            </div>
          </div>
        </MakeInert>
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
