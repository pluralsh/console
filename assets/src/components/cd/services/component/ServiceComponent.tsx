import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  ServiceDeploymentComponentFragment,
  useServiceDeploymentQuery,
} from 'generated/graphql'

import {
  COMPONENT_PARAM_ID,
  SERVICE_COMPONENT_PATH_MATCHER_ABS,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
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
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0] & {
  componentName: string | null | undefined
  componentId: string | null | undefined
}) => [
  ...getServiceDetailsBreadcrumbs({ cluster, service, tab: 'components' }),
  {
    label: componentName || componentId || '',
    url: getServiceComponentPath({
      clusterId: cluster?.id,
      serviceId: service?.id,
      componentId,
    }),
  },
]

export default function ServiceComponent() {
  const params = useParams()
  const componentId = params[COMPONENT_PARAM_ID]
  const clusterId = params[SERVICE_PARAM_CLUSTER_ID]!
  const serviceId = params[SERVICE_PARAM_ID]!

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
  const componentName = component?.name

  useSetBreadcrumbs(
    useMemo(
      () =>
        getServiceComponentBreadcrumbs({
          cluster: serviceDeployment?.cluster || { id: serviceId },
          service: serviceDeployment || { id: clusterId },
          componentId,
          componentName,
        }),
      [serviceDeployment, serviceId, clusterId, componentId, componentName]
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
      pathMatchString={SERVICE_COMPONENT_PATH_MATCHER_ABS}
    />
  )
}
