import {
  GlobeIcon,
  ListBoxItem,
  ReloadIcon,
  Select,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'

import {
  GlobalServiceFragment,
  useGetGlobalServiceQuery,
  useGlobalServicesQuery,
  useSyncGlobalServiceMutation,
} from 'generated/graphql'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  GLOBAL_SERVICE_INFO_PATH,
  GLOBAL_SERVICE_PARAM_ID,
  GLOBAL_SERVICE_SERVICES_PATH,
} from 'routes/cdRoutesConsts'

import {
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'

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
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import { useProjectId } from '../../../contexts/ProjectsContext'
import { mapExistingNodes } from '../../../../utils/graphql'
import { DistroProviderIcon } from '../../../utils/ClusterDistro'
import { TRUNCATE } from '../../../utils/truncate'

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
  const navigate = useNavigate()
  const projectId = useProjectId()
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

  const { pathname } = useLocation()
  const globalServiceId = useParams()[GLOBAL_SERVICE_PARAM_ID] ?? ''
  const pathRoot = `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${globalServiceId}`
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${pathRoot}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  const { data, error, refetch } = useGetGlobalServiceQuery({
    variables: { serviceId: globalServiceId },
  })

  const globalService = data?.globalService

  const globalServiceContext: GlobalServiceContextT = useMemo(
    () => ({ globalServiceId, globalService, refetch }),
    [globalService, globalServiceId, refetch]
  )

  const { data: globalServicesData, error: globalServicesError } =
    useFetchPaginatedData(
      {
        queryHook: useGlobalServicesQuery,
        keyPath: ['globalServices'],
      },
      { projectId }
    )

  const globalServices = useMemo(
    () => mapExistingNodes(globalServicesData?.globalServices),
    [globalServicesData?.globalServices]
  )

  if (error) return <GqlError error={error} />

  if (globalServicesError) return <GqlError error={globalServicesError} />

  if (!globalService || !globalServices) return <LoadingIndicator />

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
            marginBottom: theme.spacing.xsmall,
          }}
        >
          <div css={{ display: 'flex', gap: theme.spacing.small }}>
            <div css={{ minWidth: 320 }}>
              <Select
                titleContent={
                  globalService?.distro ? (
                    <DistroProviderIcon
                      distro={globalService.distro}
                      provider={globalService.provider?.name}
                      size={16}
                    />
                  ) : (
                    <GlobeIcon size={16} />
                  )
                }
                onSelectionChange={(id) =>
                  navigate(pathname.replace(globalServiceId, id as string))
                }
                selectedKey={globalServiceId}
              >
                {globalServices.map((gs) => (
                  <ListBoxItem
                    key={gs?.id}
                    label={
                      <div css={{ ...TRUNCATE, maxWidth: 210 }}>{gs?.name}</div>
                    }
                    textValue={gs?.name}
                    leftContent={
                      gs?.distro ? (
                        <DistroProviderIcon
                          distro={gs.distro}
                          provider={gs.provider?.name}
                          size={16}
                        />
                      ) : (
                        <GlobeIcon size={16} />
                      )
                    }
                  />
                ))}
              </Select>
            </div>
            <KickButton
              secondary
              startIcon={<ReloadIcon />}
              kickMutationHook={useSyncGlobalServiceMutation}
              message="Resync"
              tooltipMessage="Sync this service now instead of at the next poll interval"
              variables={{ id: globalServiceId }}
            />
            {headerContent}
          </div>
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
