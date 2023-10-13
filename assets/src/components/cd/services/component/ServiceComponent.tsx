import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  UnstructuredResourceDocument,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  COMPONENT_PARAM_KIND,
  COMPONENT_PARAM_NAME,
  COMPONENT_PARAM_VERSION,
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'

import { ComponentDetails } from 'components/component/ComponentDetails'
import { kindToQuery } from 'components/component/kindToQuery'
import { GqlError } from 'components/utils/Alert'

import { hasDefined } from 'utils/hasDefined'

import { getServiceComponentsBreadcrumbs } from '../service/ServiceComponents'

const pathMatchString = getServiceComponentPath({
  serviceId: ':serviceId',
  clusterName: ':clusterName',
  componentKind: ':componentKind',
  componentName: ':componentName',
  componentVersion: ':componentVersion',
})

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

export default function ServiceComponent() {
  const params = useParams()
  const componentKind = params[COMPONENT_PARAM_KIND]!
  const componentName = params[COMPONENT_PARAM_NAME]!
  const clusterName = params[SERVICE_PARAM_CLUSTER]!
  const componentVersion = params[COMPONENT_PARAM_VERSION]!
  const serviceId = params[SERVICE_PARAM_ID]!

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: {
      id: serviceId || '',
    },
  })

  const components = data?.serviceDeployment?.components

  const component = components?.find(
    (component) =>
      component?.name?.toLowerCase() === componentName?.toLowerCase() &&
      component?.kind?.toLowerCase() === componentKind?.toLowerCase() &&
      (component?.version || '') === (componentVersion || '')
  )

  const componentQuery =
    kindToQuery[componentKind ?? ''] || UnstructuredResourceDocument

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
  if (!hasDefined(component, ['name', 'namespace'])) {
    return <GqlError error="Missing component name or namespace" />
  }

  return (
    <ComponentDetails
      query={componentQuery}
      component={component}
      serviceId={serviceId}
      pathMatchString={pathMatchString}
    />
  )
}
