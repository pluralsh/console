import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
import {
  ServiceDeploymentComponentFragment,
  useServiceDeploymentQuery,
} from 'generated/graphql'

import {
  CD_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import { ComponentDetails } from 'components/component/ComponentDetails'
import { GqlError } from 'components/utils/Alert'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import { isNonNullable } from 'utils/isNonNullable'
import { getServiceDetailsBreadcrumbs } from '../service/ServiceDetails'

const getServiceComponentBreadcrumbs = ({
  cluster,
  service,
  flow,
  component,
  ...props
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0] & {
  component: Nullable<ServiceDeploymentComponentFragment>
}) => [
  ...getServiceDetailsBreadcrumbs({
    cluster,
    service,
    tab: 'components',
    flow,
    ...props,
  }),
  {
    label: component?.name ?? '',
    url: getServiceComponentPath({
      clusterId: cluster?.id,
      serviceId: service?.id,
      flowIdOrName: flow?.name,
      componentId: component?.id,
    }),
  },
]

export function ServiceComponent() {
  const { componentId, clusterId, serviceId } = useParams()
  const { flowIdOrName, flowData } = useCurrentFlow()
  const referrer = flowIdOrName ? 'flow' : 'cd'

  const settings = useDeploymentSettings()
  const { data, loading, error } = useServiceDeploymentQuery({
    variables: { id: serviceId || '' },
  })

  const serviceDeployment = data?.serviceDeployment
  const components = useMemo(
    () => serviceDeployment?.components?.filter(isNonNullable) ?? [],
    [serviceDeployment?.components]
  )

  const component: Nullable<ServiceDeploymentComponentFragment> =
    data?.serviceDeployment?.components?.find(
      (component) => component?.id === componentId
    )

  useSetBreadcrumbs(
    useMemo(
      () =>
        getServiceComponentBreadcrumbs({
          cluster: serviceDeployment?.cluster || { id: clusterId ?? '' },
          service: serviceDeployment || { id: serviceId ?? '' },
          flow: flowData?.flow,
          component,
        }),
      [serviceDeployment, clusterId, serviceId, flowData?.flow, component]
    )
  )

  if (error) return <GqlError error={error} />
  if (!(component || loading))
    return <EmptyState message="Component not found." />

  return (
    <ComponentDetails
      component={component}
      serviceLoading={loading}
      serviceComponents={components}
      service={data?.serviceDeployment}
      hasPrometheus={!!settings?.prometheusConnection}
      pathMatchString={
        referrer === 'flow'
          ? FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS
          : CD_SERVICE_COMPONENT_PATH_MATCHER_ABS
      }
    />
  )
}
