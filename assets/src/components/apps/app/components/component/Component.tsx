import { Flex } from 'honorable'
import {
  Breadcrumb,
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useContext, useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'

import { InstallationContext } from 'components/Installations'
import { useQuery } from '@apollo/client'
import {
  POLL_INTERVAL,
  ScalingType,
  ScalingTypes,
} from 'components/cluster/constants'

import {
  CERTIFICATE_Q,
  CRON_JOB_Q,
  DEPLOYMENT_Q,
  INGRESS_Q,
  JOB_Q,
  SERVICE_Q,
  STATEFUL_SET_Q,
} from 'components/cluster/queries'

import { LoginContext } from 'components/contexts'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

import { ScalingRecommenderModal } from 'components/cluster/ScalingRecommender'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ViewLogsButton } from './ViewLogsButton'

export const directory: { label: string; path: string; onlyFor?: string[] }[] =
  [
    { label: 'Info', path: 'info' },
    {
      label: 'Metrics',
      path: 'metrics',
      onlyFor: ['deployment', 'statefulset'],
    },
    { label: 'Events', path: 'events' },
    { label: 'Raw', path: 'raw' },
  ]

export const kindToQuery = {
  certificate: CERTIFICATE_Q,
  cronjob: CRON_JOB_Q,
  deployment: DEPLOYMENT_Q,
  ingress: INGRESS_Q,
  job: JOB_Q,
  service: SERVICE_Q,
  statefulset: STATEFUL_SET_Q,
} as const

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const { appName, componentKind = '', componentName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === appName)
  const { data, loading, refetch } = useQuery(kindToQuery[componentKind], {
    variables: { name: componentName, namespace: appName },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'components', url: `/apps/${appName}/components` },
      {
        label: componentName ?? '',
        url: `/apps/${appName}/components/${componentKind}/${componentName}`,
      },
    ],
    [appName, componentKind, componentName]
  )

  useSetBreadcrumbs(breadcrumbs)

  const kind: ScalingType =
    ScalingTypes[componentKind.toUpperCase()] ?? ScalingTypes.DEPLOYMENT

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )
  const subpath =
    useMatch('/apps/:appName/components/:componentKind/:componentName/:subpath')
      ?.params?.subpath || ''

  if (!me || !currentApp || !data) return <LoadingIndicator />

  const component = currentApp.status.components.find(
    ({ name, kind }) =>
      name === componentName && kind.toLowerCase() === componentKind
  )
  const filteredDirectory = directory.filter(
    ({ onlyFor }) => !onlyFor || onlyFor.includes(componentKind)
  )
  const currentTab = filteredDirectory.find(({ path }) => path === subpath)

  return (
    <ResponsivePageFullWidth
      scrollable={
        currentTab?.path === '' ||
        currentTab?.path === 'info' ||
        currentTab?.path === 'metadata'
      }
      heading={componentName}
      headingContent={
        <Flex
          gap="medium"
          className="DELETE"
          marginVertical={1}
        >
          <TabList
            gap="xxsmall"
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {filteredDirectory.map(({ label, path }) => (
              <LinkTabWrap
                key={path}
                textValue={label}
                to={path}
                subTab
              >
                <SubTab>{label}</SubTab>
              </LinkTabWrap>
            ))}
          </TabList>
          <ScalingRecommenderModal
            kind={kind}
            componentName={componentName}
            namespace={appName}
          />
          <ViewLogsButton
            metadata={value?.metadata}
            kind={componentKind}
          />
        </Flex>
      }
    >
      <TabPanel
        as={
          <Outlet
            context={{
              component,
              data,
              loading,
              refetch,
            }}
          />
        }
        stateRef={tabStateRef}
      />
    </ResponsivePageFullWidth>
  )
}
