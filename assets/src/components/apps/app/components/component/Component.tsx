import { Flex } from 'honorable'
import {
  LoopingLogo,
  SubTab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'

import {
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'

import { InstallationContext } from 'components/Installations'
import { useQuery } from '@apollo/client'
import { POLL_INTERVAL, ScalingType, ScalingTypes } from 'components/cluster/constants'

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

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

import { ScalingRecommenderModal } from 'components/cluster/ScalingRecommender'

import { ViewLogsButton } from './ViewLogsButton'

const directory = [
  { label: 'Info', path: 'info' },
  { label: 'Metrics', path: 'metrics', onlyFor: ['deployment', 'statefulset'] },
  { label: 'Events', path: 'events' },
  { label: 'Raw', path: 'raw' },
  { label: 'Metadata', path: 'metadata' },
]

const kindToQuery = {
  certificate: CERTIFICATE_Q,
  cronjob: CRON_JOB_Q,
  deployment: DEPLOYMENT_Q,
  ingress: INGRESS_Q,
  job: JOB_Q,
  service: SERVICE_Q,
  statefulset: STATEFUL_SET_Q,
}

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { me } = useContext<any>(LoginContext)
  const { appName, componentKind = '', componentName } = useParams()
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find(app => app.name === appName)
  const { data, loading, refetch } = useQuery(kindToQuery[componentKind], {
    variables: { name: componentName, namespace: appName },
    pollInterval: POLL_INTERVAL,
  })

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'components', url: `/apps/${appName}/components` },
    {
      text: componentName,
      url: `/apps/${appName}/components/${componentKind}/${componentName}`,
    },
  ]),
  [appName, componentKind, componentName, setBreadcrumbs])

  const kind: ScalingType
    = ScalingTypes[componentKind.toUpperCase()] ?? ScalingTypes.DEPLOYMENT

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(() => (data ? Object.values(data).find(value => value !== undefined) : null),
    [data])
  const subpath
    = useMatch('/apps/:appName/components/:componentKind/:componentName/:subpath')
      ?.params?.subpath || ''

  if (!me || !currentApp || !data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo />
      </Flex>
    )
  }

  const component = currentApp.status.components.find(({ name, kind }) => name === componentName && kind.toLowerCase() === componentKind)
  const filteredDirectory = directory.filter(({ onlyFor }) => !onlyFor || onlyFor.includes(componentKind))
  const currentTab = filteredDirectory.find(({ path }) => path === subpath)

  return (
    <ResponsivePageFullWidth
      scrollable={
        currentTab?.path === '' || currentTab?.path === 'info'
        || currentTab?.path === 'metadata'
      }
      heading={componentName}
      headingContent={(
        <Flex
          gap="medium"
          className="DELETE"
        >
          <TabList
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
      )}
    >
      <TabPanel
        as={(
          <Outlet
            context={{
              component,
              data,
              loading,
              refetch,
            }}
          />
        )}
        stateRef={tabStateRef}
      />
    </ResponsivePageFullWidth>
  )
}
