import { Button, SubTab, TabList, TabPanel } from '@pluralsh/design-system'
import { useContext, useEffect, useMemo, useRef } from 'react'
import { Link, Outlet, useMatch, useNavigate } from 'react-router-dom'
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
  CanaryDocument,
  CertificateDocument,
  CronJobDocument,
  DaemonSetDocument,
  DeploymentDocument,
  IngressDocument,
  JobDocument,
  PluralServiceDeploymentDocument,
  PluralServiceDeploymentFragment,
  ServiceDeploymentComponentFragment,
  ServiceDeploymentDetailsFragment,
  ServiceDocument,
  StatefulSetDocument,
  UnstructuredResourceDocument,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

export const kindToQuery = {
  certificate: CertificateDocument,
  cronjob: CronJobDocument,
  deployment: DeploymentDocument,
  ingress: IngressDocument,
  job: JobDocument,
  service: ServiceDocument,
  statefulset: StatefulSetDocument,
  daemonset: DaemonSetDocument,
  canary: CanaryDocument,
  servicedeployment: PluralServiceDeploymentDocument,
} as const

type DetailsComponent = {
  id: string
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
  service,
  serviceComponents,
  hasPrometheus,
  cdView = false,
}: {
  component: DetailsComponent
  pathMatchString: string
  cdView?: boolean
  service?: ServiceDeploymentDetailsFragment | null
  serviceComponents?: ComponentDetailsContext['serviceComponents']
  hasPrometheus?: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)
  const { me } = useContext<any>(LoginContext)
  const componentKind = component.kind?.toLowerCase() || ''
  const componentName = component.name?.toLowerCase() || ''

  const query = kindToQuery[componentKind ?? ''] || UnstructuredResourceDocument

  const vars = {
    name: component.name,
    namespace: component.namespace,
    ...(service?.id ? { serviceId: service?.id } : {}),
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
      clusterId: service?.cluster?.id,
      cluster: service?.cluster,
      serviceId: service?.id,
      serviceComponents,
    }),
    [component, data, loading, refetch, serviceComponents, service]
  )
  const pluralServiceDeploymentRef = (
    data?.pluralServiceDeployment as Nullable<PluralServiceDeploymentFragment>
  )?.reference

  const hasNotFoundError = useMemo(
    () => !data && error && error?.message?.includes('not found'),
    [data, error]
  )

  const filteredDirectory = directory.filter(
    ({ onlyFor, onlyIfNoError, onlyIfDryRun, prometheus }) =>
      (!onlyFor || (componentKind && onlyFor.includes(componentKind))) &&
      (!prometheus || !service?.cluster?.id || hasPrometheus) &&
      (!onlyIfNoError || !hasNotFoundError) &&
      (!onlyIfDryRun || (cdView && service?.dryRun))
  )

  const currentTab = filteredDirectory.find(({ path }) => path === subpath)

  useEffect(() => {
    if (!cdView || currentTab) return

    if (isEmpty(filteredDirectory)) {
      navigate(`/cd/clusters/${service?.cluster?.id}/services/${service?.id}`)
    } else {
      navigate(
        `/cd/clusters/${service?.cluster?.id}/services/${service?.id}/components/${component.id}/${filteredDirectory[0].path}`
      )
    }
  }, [navigate, currentTab, filteredDirectory, service, component, cdView])

  if (!me || loading) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      scrollable={
        currentTab?.path === '' ||
        currentTab?.path === 'info' ||
        currentTab?.path === 'metadata'
      }
      heading={componentName}
      headingContent={
        <div>
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
            {pluralServiceDeploymentRef?.id &&
              pluralServiceDeploymentRef?.cluster?.id && (
                <Button
                  as={Link}
                  to={getServiceDetailsPath({
                    serviceId: pluralServiceDeploymentRef?.id,
                    clusterId: pluralServiceDeploymentRef?.cluster.id,
                  })}
                >
                  View service
                </Button>
              )}

            <ScalingRecommenderModal
              kind={kind}
              componentName={componentName}
              namespace={component.namespace || ''}
            />
            {!service?.id && (
              <ViewLogsButton
                metadata={value?.metadata}
                kind={componentKind}
              />
            )}
          </div>
        </div>
      }
    >
      {error && currentTab?.path !== 'dryrun' && (
        <div css={{ marginBottom: theme.spacing.medium }}>
          <GqlError error={error} />
        </div>
      )}
      <TabPanel
        as={<Outlet context={outletContext} />}
        stateRef={tabStateRef}
      />
    </ResponsivePageFullWidth>
  )
}
