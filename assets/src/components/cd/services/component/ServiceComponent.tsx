import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  ServiceDeploymentComponentFragment,
  useFlowQuery,
  useServiceDeploymentQuery,
} from 'generated/graphql'

import {
  CD_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  FLOW_SERVICE_COMPONENT_PATH_MATCHER_ABS,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import { ComponentDetails } from 'components/component/ComponentDetails'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import { isNonNullable } from 'utils/isNonNullable'
import { getServiceDetailsBreadcrumbs } from '../service/ServiceDetails'

const getServiceComponentBreadcrumbs = ({
  cluster,
  service,
  componentName,
  componentId,
  ...props
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0] & {
  componentName: string | null | undefined
  componentId: string | null | undefined
}) => [
  ...getServiceDetailsBreadcrumbs({
    cluster,
    service,
    tab: 'components',
    ...props,
  }),
  {
    label: componentName || componentId || '',
    url: getServiceComponentPath({
      clusterId: cluster?.id,
      serviceId: service?.id,
      componentId,
      ...props,
    }),
  },
]

export function ServiceComponent() {
  const { componentId, clusterId, serviceId, flowId } = useParams()
  const referrer = flowId ? 'flow' : 'cd'

  const settings = useDeploymentSettings()
  const { data, loading, error } = useServiceDeploymentQuery({
    variables: { id: serviceId || '' },
  })
  const { data: flowData } = useFlowQuery({
    variables: { id: flowId || '' },
    skip: !flowId,
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
  const componentName = component?.name

  useSetBreadcrumbs(
    useMemo(
      () =>
        getServiceComponentBreadcrumbs({
          type: referrer,
          cluster: serviceDeployment?.cluster || { id: clusterId ?? '' },
          service: serviceDeployment || { id: serviceId ?? '' },
          flow: flowData?.flow,
          componentId,
          componentName,
        }),
      [
        referrer,
        serviceDeployment,
        clusterId,
        serviceId,
        flowData?.flow,
        componentId,
        componentName,
      ]
    )
  )

  if (error) return <GqlError error={error} />
  if (!data && loading) return <LoadingIndicator />
  if (!component) return <EmptyState message="Component not found" />

  return (
    <ComponentDetails
      component={component}
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
