import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CD_BASE_PATH, SERVICE_PARAM_NAME } from 'routes/cdRoutes'

import { GqlError } from 'components/utils/Alert'

import { useServiceDeploymentSecretsQuery } from 'generated/graphql'

import { getServiceDetailsBreadcrumbs } from './ServiceDetails'

export default function ServiceSecrets() {
  const serviceId = useParams()[SERVICE_PARAM_NAME]

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({ serviceId }),
      {
        label: 'secrets',
        url: `${CD_BASE_PATH}/services/${serviceId}/secrets`,
      },
    ],
    [serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)
  const { data, error } = useServiceDeploymentSecretsQuery({
    variables: { id: serviceId || '' },
  })

  if (error) {
    return <GqlError error={error} />
  }
  console.log('secrets', data?.serviceDeployment?.configuration)

  return (
    <div>
      {data?.serviceDeployment?.configuration?.map((secret) => (
        <div>{secret?.name}</div>
      ))}
    </div>
  )
}
