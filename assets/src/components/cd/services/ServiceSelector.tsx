import { ListBoxItem, Select } from '@pluralsh/design-system'
import { useCallback } from 'react'
import { ServiceDeployment } from 'generated/graphql'
import {
  CD_BASE_PATH,
  SERVICES_PATH,
  SERVICE_BASE_PATH,
  SERVICE_PARAM_NAME,
} from 'routes/cdRoutes'
import { useMatch, useNavigate } from 'react-router-dom'

export default function ServiceSelector({
  serviceDeployments,
}: {
  serviceDeployments: Pick<ServiceDeployment, 'id' | 'name'>[]
}) {
  const navigate = useNavigate()
  const pathMatch = useMatch(`/${SERVICE_BASE_PATH}*`)
  const urlSuffix = pathMatch?.params['*'] ? `/${pathMatch?.params['*']}` : ''
  const currentServiceId = pathMatch?.params[SERVICE_PARAM_NAME]

  console.log('pathMatch', pathMatch)

  const switchService = useCallback(
    (serviceId) => {
      if (serviceId !== currentServiceId)
        navigate(`/${CD_BASE_PATH}/${SERVICES_PATH}/${serviceId}${urlSuffix}`)
    },
    [currentServiceId, navigate, urlSuffix]
  )

  return (
    <Select
      aria-label="app"
      selectedKey={currentServiceId}
      onSelectionChange={switchService}
    >
      {serviceDeployments.map((serviceDeployment) => (
        <ListBoxItem
          key={serviceDeployment.id}
          label={serviceDeployment.name}
          textValue={serviceDeployment.name}
        />
      ))}
    </Select>
  )
}
