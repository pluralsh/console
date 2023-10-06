import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { CD_BASE_PATH, SERVICE_PARAM_NAME } from 'routes/cdRoutes'

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

  return <div>Secrets</div>
}
