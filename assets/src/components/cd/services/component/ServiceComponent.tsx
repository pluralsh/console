import { Flex } from 'honorable'
import {
  Breadcrumb,
  SubTab,
  TabList,
  TabPanel,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useContext, useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams, useSearchParams } from 'react-router-dom'

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
  COMPONENT_PARAM_VERSION,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import { ViewLogsButton } from 'components/apps/app/components/component/ViewLogsButton'

import {
  directory,
  kindToQuery,
} from 'components/apps/app/components/component/Component'

import {
  useServiceDeploymentComponentsQuery,
  useUnstructuredResourceQuery,
} from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

export const getServiceComponentBreadcrumbs = ({
  serviceId,
  clusterName,
  componentKind,
  componentName,
}: Parameters<typeof getServiceComponentsBreadcrumbs>[0] & {
  componentKind: string | null | undefined
  componentName: string | null | undefined
}) => [
  ...getServiceComponentsBreadcrumbs({ clusterName, serviceId }),
  {
    label: componentName ?? '',
    url: getServiceComponentPath({
      clusterName,
      serviceId,
      componentKind,
      componentName,
    }),
  },
]

function V1Component({ query, ...props }: any) {
  console.log('v1 props', props)
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const params = useParams()
  const [searchParams] = useSearchParams()

  console.log('params', params)
  console.log('searchParams', searchParams)

  const componentKind = params[COMPONENT_PARAM_KIND]
  const componentName = params[COMPONENT_PARAM_NAME]
  const clusterName = params[SERVICE_PARAM_CLUSTER]
  const serviceId = params[SERVICE_PARAM_ID]

  console.log({ query })
  const { data, loading, refetch, error } = useQuery(query, {
    variables: { name: componentName, namespace: clusterName },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

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
      })}/:subpath`
    )?.params?.subpath || ''

  if (error) {
    return <GqlError error={error} />
  }
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
            namespace={serviceId}
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

function UnstructuredComponent() {
  console.log('v1 props', props)
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const params = useParams()
  const [searchParams] = useSearchParams()

  console.log('params', params)
  console.log('searchParams', searchParams)

  const componentKind = params[COMPONENT_PARAM_KIND]
  const componentName = params[COMPONENT_PARAM_NAME]
  const clusterName = params[SERVICE_PARAM_CLUSTER]
  const serviceId = params[SERVICE_PARAM_ID]

  const variables = {
    //   namespace: 'hello',
    //   serviceId: 'hello',
    kind: componentKind || '',
    name: componentName || '',
    version,
    ...(group ? { group } : {}),
  }

  console.log('variables', variables)
  const { data, loading, refetch, error } = useUnstructuredResourceQuery({
    variables,
  })

  console.log({ data, loading, refetch, error })

  console.log('unstructuredResource', data?.unstructuredResource)

  return <div>Unstructured</div>
}

export default function Component() {
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const params = useParams()
  const [searchParams] = useSearchParams()

  console.log('params', params)
  console.log('searchParams', searchParams)

  const componentKind = params[COMPONENT_PARAM_KIND]
  const componentName = params[COMPONENT_PARAM_NAME]
  const version = params[COMPONENT_PARAM_VERSION]
  const clusterName = params[SERVICE_PARAM_CLUSTER]
  const serviceId = params[SERVICE_PARAM_ID]

  const namespace = searchParams.get('namespace')

  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === serviceId)

  const {
    data: serviceData,
    loading: serviceLoading,
    error: serviceError,
  } = useServiceDeploymentComponentsQuery({
    variables: {
      serviceId: serviceId || '',
    },
  })

  const v1ComponentQuery = kindToQuery[componentKind ?? '']

  const breadcrumbs: Breadcrumb[] = useMemo(
    () =>
      getServiceComponentBreadcrumbs({
        clusterName,
        serviceId,
        componentKind,
        componentName,
      }),
    [clusterName, serviceId, componentKind, componentName]
  )

  useSetBreadcrumbs(breadcrumbs)
  if (v1ComponentQuery) {
    return <V1Component query={v1ComponentQuery} />
  }

  return <UnstructuredComponent />
}
