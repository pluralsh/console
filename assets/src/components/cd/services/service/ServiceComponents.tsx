import { type Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { CD_BASE_PATH, SERVICE_PARAM_NAME } from 'routes/cdRoutes'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useComponentKindSelect } from 'components/apps/app/components/Components'
import { useServiceDeploymentComponentsQuery } from 'generated/graphql'
import { ComponentList } from 'components/apps/app/components/ComponentList'

export default function ServiceComponents() {
  const serviceId = useParams()[SERVICE_PARAM_NAME]

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: 'services', url: `${CD_BASE_PATH}/services` },
      {
        label: serviceId ?? '',
        url: `${CD_BASE_PATH}/services/${serviceId}`,
      },
      {
        label: 'components',
        url: `${CD_BASE_PATH}/services/${serviceId}/components`,
      },
    ],
    [serviceId]
  )

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })

  useSetBreadcrumbs(breadcrumbs)
  const { kindSelector, selectedKinds } = useComponentKindSelect(
    data?.serviceDeployment?.components
  )

  console.log('service components data', data)
  console.log('service components error', error)

  if (error) {
    return null
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={kindSelector}
    >
      <ComponentList
        setUrl={(c) =>
          c?.name && c?.kind
            ? `${CD_BASE_PATH}/services/${serviceId}/components/${c.kind.toLowerCase()}/${
                c.name
              }`
            : undefined
        }
        components={data.serviceDeployment?.components || []}
        selectedKinds={selectedKinds}
      />
    </ScrollablePage>
  )
}
