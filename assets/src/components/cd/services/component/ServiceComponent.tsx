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

import { LoginContext } from 'components/contexts'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { LinkTabWrap } from 'components/utils/Tabs'

import { ScalingRecommenderModal } from 'components/cluster/ScalingRecommender'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  COMPONENT_PARAM_KIND,
  COMPONENT_PARAM_NAME,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_NAME,
  getServiceComponentPath,
} from 'routes/cdRoutes'

import { ViewLogsButton } from 'components/apps/app/components/component/ViewLogsButton'

import {
  directory,
  kindToQuery,
} from 'components/apps/app/components/component/Component'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

export const getServiceComponentBreadcrumbs = ({
  serviceName,
  clusterName,
  componentKind,
  componentName,
}: Parameters<typeof getServiceComponentsBreadcrumbs>[0] & {
  componentKind: string | null | undefined
  componentName: string | null | undefined
}) => [
  ...getServiceComponentsBreadcrumbs({ clusterName, serviceName }),
  {
    label: componentName ?? '',
    url: getServiceComponentPath({
      clusterName,
      serviceName,
      componentKind,
      componentName,
    }),
  },
]

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const params = useParams()

  const componentKind = params[COMPONENT_PARAM_KIND]
  const componentName = params[COMPONENT_PARAM_NAME]
  const clusterName = params[SERVICE_PARAM_CLUSTER]
  const serviceName = params[SERVICE_PARAM_NAME]

  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === serviceName)
  const query = kindToQuery[componentKind ?? '']

  console.log({ query })
  const { data, loading, refetch } = useQuery(query, {
    variables: { name: componentName, namespace: clusterName },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const breadcrumbs: Breadcrumb[] = useMemo(
    () =>
      getServiceComponentBreadcrumbs({
        clusterName,
        serviceName,
        componentKind,
        componentName,
      }),
    [clusterName, serviceName, componentKind, componentName]
  )

  useSetBreadcrumbs(breadcrumbs)

  const kind: ScalingType =
    ScalingTypes[(componentKind ?? '')?.toUpperCase()] ??
    ScalingTypes.DEPLOYMENT

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
    ({ onlyFor }) =>
      !onlyFor || (componentKind && onlyFor.includes(componentKind))
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
            namespace={serviceName}
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
