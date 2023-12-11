import { SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { useContext, useMemo, useRef } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
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
import { ViewLogsButton } from 'components/component/ViewLogsButton'
import { directory } from 'components/component/directory'
import {
  CertificateDocument,
  CronJobDocument,
  DeploymentDocument,
  IngressDocument,
  JobDocument,
  ServiceDeploymentComponentFragment,
  ServiceDocument,
  StatefulSetDocument,
  UnstructuredResourceDocument,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { useTheme } from 'styled-components'

export const kindToQuery = {
  certificate: CertificateDocument,
  cronjob: CronJobDocument,
  deployment: DeploymentDocument,
  ingress: IngressDocument,
  job: JobDocument,
  service: ServiceDocument,
  statefulset: StatefulSetDocument,
} as const

type DetailsComponent = {
  name: string
  namespace?: string | null | undefined
  kind: string
  version?: string | null | undefined
  group?: string | null | undefined
}

export type ComponentDetailsContext = {
  component: DetailsComponent
  refetch: () => void
  data: any
  loading: boolean
  clusterName?: string
  cluster?: any
  serviceId?: string
  serviceComponents?:
    | (ServiceDeploymentComponentFragment | null | undefined)[]
    | null
    | undefined
}

export function ComponentDetails({
  component,
  pathMatchString,
  clusterId,
  cluster,
  serviceId,
  serviceComponents,
  hasPrometheus,
}: {
  component: DetailsComponent
  pathMatchString: string
  clusterId?: string
  cluster?: any
  serviceId?: string
  hasPrometheus?: boolean
  serviceComponents?: ComponentDetailsContext['serviceComponents']
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const componentKind = component.kind?.toLowerCase() || ''
  const componentName = component.name?.toLowerCase() || ''

  const query = kindToQuery[componentKind ?? ''] || UnstructuredResourceDocument

  const vars = {
    name: component.name,
    namespace: component.namespace,
    ...(serviceId ? { serviceId } : {}),
    ...(query === UnstructuredResourceDocument
      ? {
          kind: component.kind,
          version: component.version,
          group: component.group,
        }
      : {}),
  }

  const { data, loading, refetch, error } = useQuery(query, {
    variables: vars,
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
  const subpath = useMatch(`${pathMatchString}/:subpath`)?.params?.subpath || ''
  const outletContext: ComponentDetailsContext = useMemo(
    () => ({
      component,
      data,
      loading,
      refetch,
      clusterId,
      cluster,
      serviceId,
      serviceComponents,
    }),
    [
      clusterId,
      cluster,
      component,
      data,
      loading,
      refetch,
      serviceComponents,
      serviceId,
    ]
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!me || !data) return <LoadingIndicator />

  const filteredDirectory = directory.filter(
    ({ onlyFor, prometheus }) =>
      (!onlyFor || (componentKind && onlyFor.includes(componentKind))) &&
      (!prometheus || !clusterId || hasPrometheus)
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
            namespace={component.namespace || ''}
          />
          {!serviceId && (
            <ViewLogsButton
              metadata={value?.metadata}
              kind={componentKind}
            />
          )}
        </div>
      }
    >
      <TabPanel
        as={<Outlet context={outletContext} />}
        stateRef={tabStateRef}
      />
    </ResponsivePageFullWidth>
  )
}
