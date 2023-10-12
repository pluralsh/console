import {
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useContext, useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams, useSearchParams } from 'react-router-dom'

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
  COMPONENT_PARAM_VERSION,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import { ViewLogsButton } from 'components/component/ViewLogsButton'

import { directory } from 'components/component/directory'
import { kindToQuery } from 'components/component/kindToQuery'

import {
  ServiceDeploymentComponentFragment,
  useServiceDeploymentComponentsQuery,
  useUnstructuredResourceQuery,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { useTheme } from 'styled-components'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

export const getServiceComponentBreadcrumbs = ({
  serviceId,
  clusterName,
  componentKind,
  componentName,
  componentVersion,
}: Parameters<typeof getServiceComponentsBreadcrumbs>[0] & {
  componentKind: string | null | undefined
  componentName: string | null | undefined
  componentVersion: string | null | undefined
}) => [
  ...getServiceComponentsBreadcrumbs({ clusterName, serviceId }),
  {
    label: componentName ?? '',
    url: getServiceComponentPath({
      clusterName,
      serviceId,
      componentKind,
      componentName,
      componentVersion,
    }),
  },
]

function V1Component({
  query,
  component,
  serviceId,
}: {
  query: any
  serviceId: string
  component: ServiceDeploymentComponentFragment
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const params = useParams()
  const [searchParams] = useSearchParams()
  const componentKind = component.kind
  const componentName = component.name

  console.log('params', params)
  console.log('searchParams', searchParams)

  console.log({ query })
  const vars = {
    name: component.name,
    namespace: component.namespace,
    serviceId,
  }

  console.log('vars: ', vars)

  const { data, loading, refetch, error } = useQuery(query, {
    variables: vars,
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  console.log('v1 component', { data, loading, error })

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
    useMatch(
      `${getServiceComponentPath({
        serviceId: ':serviceId',
        clusterName: ':clusterName',
        componentKind: ':componentKind',
        componentName: ':componentName',
        componentVersion: ':componentVersion',
      })}/:subpath`
    )?.params?.subpath || ''

  if (error) {
    return <GqlError error={error} />
  }
  if (!me || !data) return <LoadingIndicator />

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
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
            className: 'DELETE',
            margin: `${theme.spacing.medium}px 0`,
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
            namespace={serviceId}
          />
          <ViewLogsButton
            metadata={value?.metadata}
            kind={componentKind}
          />
        </div>
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

function UnstructuredComponent({
  component,
  serviceId,
  ...props
}: {
  serviceId: string
  component: ServiceDeploymentComponentFragment
}) {
  console.log('UnstructuredComponent props', props)
  const params = useParams()
  const [searchParams] = useSearchParams()

  console.log('params', params)
  console.log('searchParams', searchParams)
  const { kind, name, version, namespace, group } = component

  const variables = {
    name,
    version: version || '',
    kind,
    serviceId,
    namespace,
    group,
  }

  console.log('variables', variables)
  const { data, loading, refetch, error } = useUnstructuredResourceQuery({
    variables,
  })

  console.log({ data, loading, refetch, error })

  console.log('unstructuredResource', data?.unstructuredResource)

  if (error) {
    return <GqlError error={error} />
  }

  return <div>Unstructured</div>
}

export default function Component() {
  const params = useParams()
  const componentKind = params[COMPONENT_PARAM_KIND]!
  const componentName = params[COMPONENT_PARAM_NAME]!
  const clusterName = params[SERVICE_PARAM_CLUSTER]!
  const componentVersion = params[COMPONENT_PARAM_VERSION]!
  const serviceId = params[SERVICE_PARAM_ID]!

  const { data, loading, error } = useServiceDeploymentComponentsQuery({
    variables: {
      id: serviceId || '',
    },
  })

  console.log('getting compoent', { data, loading, error })

  const components = data?.serviceDeployment?.components

  console.log('components', components)
  console.log('componentName', componentName)
  console.log('componentKind', componentKind)

  const component = components?.find(
    (component) =>
      component?.name?.toLowerCase() === componentName?.toLowerCase() &&
      component?.kind?.toLowerCase() === componentKind?.toLowerCase()
    // (component?.version || '') === (componentVersion || '')
  )

  console.log('component', component)

  const v1ComponentQuery = kindToQuery[componentKind ?? '']

  useSetBreadcrumbs(
    useMemo(
      () =>
        getServiceComponentBreadcrumbs({
          clusterName,
          serviceId,
          componentKind,
          componentName,
          componentVersion,
        }),
      [clusterName, serviceId, componentKind, componentName, componentVersion]
    )
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!component) {
    return <LoadingIndicator />
  }

  if (v1ComponentQuery) {
    return (
      <V1Component
        query={v1ComponentQuery}
        component={component}
        serviceId={serviceId}
      />
    )
  }

  return (
    <UnstructuredComponent
      component={component}
      serviceId={serviceId}
    />
  )
}
