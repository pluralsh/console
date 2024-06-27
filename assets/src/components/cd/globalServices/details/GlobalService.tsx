import { ReloadIcon, SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'

import {
  GlobalServiceFragment,
  useGetGlobalServiceQuery,
  useSyncGlobalServiceMutation,
} from 'generated/graphql'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  GLOBAL_SERVICE_INFO_PATH,
  GLOBAL_SERVICE_PARAM_ID,
  GLOBAL_SERVICE_SERVICES_PATH,
} from 'routes/cdRoutesConsts'

import { Outlet, useMatch, useParams } from 'react-router-dom'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { useTheme } from 'styled-components'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  CD_BASE_CRUMBS,
  PageHeaderContext,
  PageScrollableContext,
} from '../../ContinuousDeployment'

import { LinkTabWrap } from '../../../utils/Tabs'

import { PluralErrorBoundary } from '../../PluralErrorBoundary'
import KickButton from '../../../utils/KickButton'
import { GqlError } from '../../../utils/Alert'

export type GlobalServiceContextT = {
  globalServiceId: string
  globalService: Nullable<GlobalServiceFragment>
  refetch: () => void
}

export const getBreadcrumbs = (
  globalServiceId: string,
  globalService: Nullable<GlobalServiceFragment>
) => [
  ...CD_BASE_CRUMBS,
  {
    label: 'global services',
    url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
  },
  {
    label: globalService?.name || globalServiceId,
    url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${globalServiceId}`,
  },
]

const directory = [
  { path: GLOBAL_SERVICE_INFO_PATH, label: 'Info' },
  { path: GLOBAL_SERVICE_SERVICES_PATH, label: 'Services' },
] as const

export default function GlobalService() {
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

  const globalServiceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''
  const pathRoot = `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${globalServiceId}`
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${pathRoot}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  const { data, loading, error, refetch } = useGetGlobalServiceQuery({
    variables: { serviceId: globalServiceId },
  })

  const globalServiceContext: GlobalServiceContextT = useMemo(
    () => ({
      globalServiceId,
      globalService: data?.globalService,
      refetch,
    }),
    [data, refetch]
  )

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

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
          <KickButton
            secondary
            startIcon={<ReloadIcon />}
            kickMutationHook={useSyncGlobalServiceMutation}
            message="Resync"
            tooltipMessage="Sync this service now instead of at the next poll interval"
            variables={{ id: globalServiceId }}
          />
          {headerContent}
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
                to={`${pathRoot}/${path}`}
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
          <PageHeaderContext.Provider value={pageHeaderContext}>
            <PageScrollableContext.Provider value={pageScrollableContext}>
              <Suspense fallback={<LoadingIndicator />}>
                <Outlet context={globalServiceContext} />
              </Suspense>
            </PageScrollableContext.Provider>
          </PageHeaderContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
