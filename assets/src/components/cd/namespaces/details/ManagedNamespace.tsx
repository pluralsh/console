import {
  ListBoxItem,
  NamespaceIcon,
  Select,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { ReactNode, Suspense, useMemo, useRef, useState } from 'react'

import {
  ManagedNamespaceFragment,
  useGetManagedNamespaceQuery,
  useManagedNamespacesQuery,
} from 'generated/graphql'
import {
  CD_REL_PATH,
  NAMESPACES_PARAM_ID,
  NAMESPACES_REL_PATH,
  NAMESPACE_INFO_PATH,
  NAMESPACE_SERVICES_PATH,
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
import { GqlError } from '../../../utils/Alert'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'
import { useProjectId } from '../../../contexts/ProjectsContext'
import { mapExistingNodes } from '../../../../utils/graphql'
import { TRUNCATE } from '../../../utils/truncate'

export type ManagedNamespaceContextT = {
  namespaceId: string
  namespace: Nullable<ManagedNamespaceFragment>
  refetch: () => void
}

export const getBreadcrumbs = (
  namespaceId: string,
  namespace: Nullable<ManagedNamespaceFragment>
) => [
  ...CD_BASE_CRUMBS,
  {
    label: 'namespaces',
    url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}`,
  },
  {
    label: namespace?.name || namespaceId,
    url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}/${namespaceId}`,
  },
]

const directory = [
  { path: NAMESPACE_INFO_PATH, label: 'Info' },
  { path: NAMESPACE_SERVICES_PATH, label: 'Services' },
] as const

export default function ManagedNamespace() {
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
  const namespaceId = useParams()[NAMESPACES_PARAM_ID] ?? ''
  const pathRoot = `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}/${namespaceId}`
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${pathRoot}/:tab/*`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  const { data, error, refetch } = useGetManagedNamespaceQuery({
    variables: { namespaceId },
  })

  const namespace = data?.managedNamespace

  const namespaceContext: ManagedNamespaceContextT = useMemo(
    () => ({ namespaceId, namespace, refetch }),
    [namespace, namespaceId, refetch]
  )

  const { data: namespacesData, error: namespacesError } =
    useFetchPaginatedData(
      {
        queryHook: useManagedNamespacesQuery,
        keyPath: ['managedNamespaces'],
      },
      { projectId }
    )

  const namespaces = useMemo(
    () => mapExistingNodes(namespacesData?.managedNamespaces),
    [namespacesData?.managedNamespaces]
  )

  if (error) return <GqlError error={error} />

  if (namespacesError) return <GqlError error={namespacesError} />

  if (!namespace || !namespaces) return <LoadingIndicator />

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
                titleContent={<NamespaceIcon size={16} />}
                onSelectionChange={(id) =>
                  navigate(pathname.replace(namespaceId, id as string))
                }
                selectedKey={namespaceId}
              >
                {namespaces.map((ns) => (
                  <ListBoxItem
                    key={ns?.id}
                    label={
                      <div css={{ ...TRUNCATE, maxWidth: 210 }}>{ns?.name}</div>
                    }
                    textValue={ns?.name}
                  />
                ))}
              </Select>
            </div>
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
                <Outlet context={namespaceContext} />
              </Suspense>
            </PageScrollableContext.Provider>
          </PageHeaderContext.Provider>
        </TabPanel>
      </PluralErrorBoundary>
    </ResponsivePageFullWidth>
  )
}
