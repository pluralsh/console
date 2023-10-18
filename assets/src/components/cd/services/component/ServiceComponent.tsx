import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactNode, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { useServiceDeploymentComponentsQuery } from 'generated/graphql'

import {
  COMPONENT_PARAM_ID,
  SERVICE_COMPONENT_PATH_MATCHER_ABS,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ComponentDetails } from 'components/component/ComponentDetails'
import { GqlError } from 'components/utils/Alert'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

export const getServiceComponentBreadcrumbs = ({
  serviceId,
  clusterName,
  componentName,
  componentId,
  ...props
}: Parameters<typeof getServiceComponentsBreadcrumbs>[0] & {
  componentName: string | null | undefined
  componentId: string | null | undefined
}) => [
  ...getServiceComponentsBreadcrumbs({ clusterName, serviceId, ...props }),
  {
    label: componentName || componentId || '',
    url: getServiceComponentPath({
      clusterName,
      serviceId,
      componentId,
    }),
  },
]

function BreadcrumbWrapper({
  clusterName,
  serviceId,
  serviceName,
  componentId,
  componentName,
  children,
}: {
  clusterName: string
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
          clusterName,
          serviceId,
          serviceName,
          componentId,
          componentName,
        }),
      [clusterName, serviceId, serviceName, componentId, componentName]
    )
  )

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}

export default function ServiceComponent() {
  const params = useParams()
  const componentId = params[COMPONENT_PARAM_ID]
  const clusterName = params[SERVICE_PARAM_CLUSTER]!
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
    clusterName,
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
        clusterName={clusterName}
        serviceId={serviceId}
        pathMatchString={SERVICE_COMPONENT_PATH_MATCHER_ABS}
      />
    </BreadcrumbWrapper>
  )
}
