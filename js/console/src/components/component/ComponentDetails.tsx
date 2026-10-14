import { Button, KubernetesAltIcon } from '@pluralsh/design-system'
import { ViewLogsButton } from 'components/component/ViewLogsButton'
import { useLogin } from 'components/contexts'
import { PageColumnSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { GqlError } from 'components/utils/Alert'
import {
  ClusterMinimalFragment,
  ServiceDeploymentComponentFragment,
  ServiceDeploymentDetailsFragment,
} from 'generated/graphql'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

import { useExplainWithAI } from 'components/ai/AIContext.tsx'
import { Kind } from 'components/kubernetes/common/types.ts'
import {
  getKubernetesCustomResourceDetailsPath,
  getResourceDetailsAbsPath,
  isCRD,
} from 'routes/kubernetesRoutesConsts.tsx'
import { PageHeaderContext } from '../cd/ContinuousDeployment.tsx'
import { getDirectory } from './directory.tsx'
import {
  ComponentDetailsT,
  isUnstructured,
  useFetchComponentDetails,
} from './useFetchComponentDetails.tsx'

export type ComponentDetailsContext = {
  component: Nullable<ServiceDeploymentComponentFragment>
  refetch: () => void
  componentDetails: Nullable<ComponentDetailsT>
  loading: boolean
  cluster?: Nullable<ClusterMinimalFragment>
  serviceId?: string
}

export function ComponentDetails({
  component,
  serviceLoading,
  pathMatchString,
  service,
  serviceComponents,
  hasPrometheus,
}: {
  component: Nullable<ServiceDeploymentComponentFragment>
  serviceLoading: boolean
  pathMatchString: string
  service?: Nullable<ServiceDeploymentDetailsFragment>
  serviceComponents: ServiceDeploymentComponentFragment[]
  hasPrometheus?: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { flowIdOrName } = useParams()
  const { me } = useLogin()
  const componentKind = component?.kind?.toLowerCase() || ''

  const {
    data,
    loading: componentLoading,
    refetch,
    error,
  } = useFetchComponentDetails({ component, service })
  const loading = !me || componentLoading || serviceLoading

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: Nullable<ComponentDetailsT> = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )
  const visibleError = data ? undefined : error

  useExplainWithAI(
    value
      ? `Describe the following kubernetes resource: ${value?.raw}`
      : undefined
  )

  const subpath = useMatch(`${pathMatchString}/:subpath`)?.params?.subpath || ''
  const outletContext: ComponentDetailsContext = useMemo(
    () => ({
      component,
      componentDetails: value,
      loading,
      refetch,
      cluster: service?.cluster,
      serviceId: service?.id,
      serviceComponents,
    }),
    [component, loading, refetch, service, serviceComponents, value]
  )
  const pluralServiceDeploymentRef =
    value?.__typename === 'PluralServiceDeployment' ? value.reference : null

  const hasNotFoundError = useMemo(
    () => visibleError?.message?.includes('not found'),
    [visibleError]
  )

  const filteredDirectory = getDirectory(component?.insight).filter(
    ({ onlyFor, onlyIfNoError, onlyIfDryRun, prometheus, path }) =>
      (!onlyFor || (componentKind && onlyFor.includes(componentKind))) &&
      (!prometheus || !service?.cluster?.id || hasPrometheus) &&
      (!onlyIfNoError || !hasNotFoundError) &&
      (!onlyIfDryRun || service?.dryRun) &&
      !(path === 'info' && isUnstructured(componentKind)) &&
      !(path === 'insights' && !component?.insight)
  )

  const currentTab = filteredDirectory.find(({ path }) => path === subpath)
  const tabs = filteredDirectory.map(({ path, label }) => ({ path, label }))

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const pageHeaderContext = useMemo(() => ({ setHeaderContent }), [])

  useEffect(() => {
    if (currentTab || !service) return // default to first tab once everything is loaded
    navigate(filteredDirectory[0].path, { replace: true })
  }, [currentTab, filteredDirectory, navigate, service])

  return (
    <PageHeaderContext value={pageHeaderContext}>
      <PageColumnSC>
        <PageToolbar
          tabs={tabs}
          activeFn={(path) => path === subpath}
        >
          {service?.cluster?.id && component && (
            <ViewInDashboardButton
              clusterId={service.cluster.id}
              component={component}
            />
          )}
          {pluralServiceDeploymentRef?.cluster?.id && (
            <Button
              small
              as={Link}
              to={getServiceDetailsPath({
                flowIdOrName,
                serviceId: pluralServiceDeploymentRef.id,
                clusterId: pluralServiceDeploymentRef.cluster.id,
              })}
            >
              View Service
            </Button>
          )}
          {!service?.id && (
            <ViewLogsButton
              metadata={value?.metadata}
              kind={componentKind}
            />
          )}
          {headerContent}
        </PageToolbar>
        <ResponsivePageFullWidth
          scrollable={
            currentTab?.path === '' ||
            currentTab?.path === 'info' ||
            currentTab?.path === 'metadata'
          }
        >
          {visibleError && currentTab?.path !== 'dryrun' && (
            <div css={{ marginBottom: theme.spacing.medium }}>
              <GqlError error={visibleError} />
            </div>
          )}
          <Outlet context={outletContext} />
        </ResponsivePageFullWidth>
      </PageColumnSC>
    </PageHeaderContext>
  )
}

function ViewInDashboardButton({
  clusterId,
  component,
}: {
  clusterId: string
  component: ServiceDeploymentComponentFragment
}) {
  const { name, kind, namespace, group } = component

  const supportedResourceKind = useMemo(
    () => Object.values(Kind).find((k) => k === kind?.toLowerCase()),
    [kind]
  )

  const to = useMemo(() => {
    // Supported core resources.
    if (supportedResourceKind) {
      return getResourceDetailsAbsPath(
        clusterId,
        supportedResourceKind,
        name,
        namespace
      )
    }

    // Custom resources.
    if (kind && group && isCRD(group)) {
      return getKubernetesCustomResourceDetailsPath({
        clusterId,
        group,
        kind,
        name,
        namespace,
      })
    }

    return undefined
  }, [clusterId, group, kind, name, namespace, supportedResourceKind])

  if (!to) return undefined

  return (
    <Button
      small
      as={Link}
      secondary
      startIcon={<KubernetesAltIcon />}
      to={to}
    >
      View in Dashboard
    </Button>
  )
}
