import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactNode, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { useServiceDeploymentComponentsQuery } from 'generated/graphql'

import {
  COMPONENT_PARAM_ID,
  SERVICE_COMPONENT_PATH_MATCHER_ABS,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ComponentDetails } from 'components/component/ComponentDetails'
import { GqlError } from 'components/utils/Alert'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

export const getServiceComponentBreadcrumbs = ({
  serviceId,
  clusterId,
  componentName,
  componentId,
  ...props
}: Parameters<typeof getServiceComponentsBreadcrumbs>[0] & {
  componentName: string | null | undefined
  componentId: string | null | undefined
}) => [
  ...getServiceComponentsBreadcrumbs({
    clusterId,
    serviceId,
    ...props,
  }),
  {
    label: componentName || componentId || '',
    url: getServiceComponentPath({
      clusterId,
      serviceId,
      componentId,
    }),
  },
]

function BreadcrumbWrapper({
  clusterId,
  serviceId,
  serviceName,
  componentId,
  componentName,
  children,
}: {
  clusterId: string
  serviceId: string
  serviceName: string | undefined
  componentId: string | undefined
  componentName: string | undefined

  children: ReactNode
}) {
  useSetBreadcrumbs(
    useMemo(
      () =>
        getServiceComponentBreadcrumbs({
          clusterId,
          serviceId,
          serviceName,
          componentId,
          componentName,
        }),
      [clusterId, serviceId, serviceName, componentId, componentName]
    )
  )

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}

export default function ServiceComponent() {
  const params = useParams()
  const componentId = params[COMPONENT_PARAM_ID]
  const clusterId = params[SERVICE_PARAM_CLUSTER_ID]!
  const serviceId = params[SERVICE_PARAM_ID]!

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: {
      id: serviceId || '',
    },
  })

  const serviceName = data?.serviceDeployment?.name
  const components = data?.serviceDeployment?.components

  const component = components?.find(
    (component) => component?.id === componentId
  )
  const componentName = component?.name

  const breadcrumbProps = {
    clusterId,
    serviceId,
    serviceName,
    componentId,
    componentName,
  }

  if (error) {
    return <GqlError error={error} />
  }
  if (!component) {
    return <LoadingIndicator />
  }

  return (
    <BreadcrumbWrapper {...breadcrumbProps}>
      <ComponentDetails
        component={component}
        serviceComponents={components}
        clusterId={clusterId}
        serviceId={serviceId}
        pathMatchString={SERVICE_COMPONENT_PATH_MATCHER_ABS}
      />
    </BreadcrumbWrapper>
  )
}
